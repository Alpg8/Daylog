import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import {
  assertDriverOrderAccess,
  buildTimelineWarnings,
  isDriverRole,
  isOpsViewer,
  mapDriverForUserOrFail,
} from "@/lib/services/driver-operations";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isDriverRole(session.role)) {
    const driver = await mapDriverForUserOrFail(session.sub, session.role);
    if (!driver) return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });

    const allowedOrder = await assertDriverOrderAccess(session.sub, session.role, params.id);
    if (!allowedOrder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else if (!isOpsViewer(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      vehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
      trailer: { select: { id: true, plateNumber: true, type: true } },
      driver: { select: { id: true, fullName: true, phoneNumber: true } },
      driverEvents: {
        include: {
          photos: true,
          driver: { select: { id: true, fullName: true } },
        },
        orderBy: { eventAt: "desc" },
      },
      driverConfirmations: {
        include: {
          event: { select: { id: true, type: true, eventAt: true } },
        },
        orderBy: { confirmedAt: "desc" },
      },
      handovers: {
        include: {
          fromDriver: { select: { id: true, fullName: true } },
          toDriver: { select: { id: true, fullName: true } },
        },
        orderBy: { handoverAt: "desc" },
      },
      driverHistory: {
        include: {
          driver: { select: { id: true, fullName: true, phoneNumber: true } },
          assignedByUser: { select: { id: true, name: true } },
        },
        orderBy: { assignedAt: "desc" },
      },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const eventTypesWithPhoto = order.driverEvents
    .filter((event) => event.photos.length > 0)
    .map((event) => event.type);
  const eventTypes = order.driverEvents.map((event) => event.type);

  const confirmationTypes = order.driverConfirmations.map((item) => item.type);
  const hasEndJob = order.driverEvents.some((event) => event.type === "END_JOB");

  const warnings = buildTimelineWarnings({
    eventTypes,
    eventTypesWithPhoto,
    confirmationTypes,
    hasEndJob,
    orderStatus: order.status,
  });

  return NextResponse.json({
    order,
    warnings,
    lastEventAt: order.driverEvents[0]?.eventAt ?? null,
    lastEventType: order.driverEvents[0]?.type ?? null,
  });
}
