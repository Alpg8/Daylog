import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { createDriverConfirmationSchema } from "@/lib/validators/driver-operations";
import {
  assertDriverOrderAccess,
  createOpsNotificationForDriverAndOps,
  isDriverRole,
  isOpsViewer,
  mapDriverForUserOrFail,
} from "@/lib/services/driver-operations";
import { recordActivity } from "@/lib/services/activity-log";

export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId") ?? undefined;

  const where: {
    orderId?: string;
    driverId?: string;
  } = {};

  if (orderId) where.orderId = orderId;

  if (isDriverRole(session.role)) {
    const driver = await mapDriverForUserOrFail(session.sub, session.role);
    if (!driver) return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
    where.driverId = driver.id;
  } else if (!isOpsViewer(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const confirmations = await prisma.driverConfirmation.findMany({
    where,
    include: {
      driver: { select: { id: true, fullName: true } },
      order: { select: { id: true, cargoNumber: true, tripNumber: true } },
      event: { select: { id: true, type: true, eventAt: true } },
    },
    orderBy: { confirmedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ confirmations });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createDriverConfirmationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  let driverId: string | null = null;

  if (isDriverRole(session.role)) {
    const driver = await mapDriverForUserOrFail(session.sub, session.role);
    if (!driver) return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });

    const allowedOrder = await assertDriverOrderAccess(session.sub, session.role, payload.orderId);
    if (!allowedOrder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    driverId = driver.id;
  } else if (isOpsViewer(session.role)) {
    const order = await prisma.order.findUnique({
      where: { id: payload.orderId },
      select: { driverId: true },
    });
    driverId = order?.driverId ?? null;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!driverId) {
    return NextResponse.json({ error: "Order has no assigned driver" }, { status: 400 });
  }

  if (payload.eventId) {
    const linkedEvent = await prisma.driverEvent.findUnique({
      where: { id: payload.eventId },
      select: { id: true, orderId: true, driverId: true },
    });

    if (!linkedEvent || linkedEvent.orderId !== payload.orderId || linkedEvent.driverId !== driverId) {
      return NextResponse.json({ error: "Invalid event link" }, { status: 400 });
    }
  }

  const confirmation = await prisma.driverConfirmation.create({
    data: {
      orderId: payload.orderId,
      driverId,
      eventId: payload.eventId ?? null,
      type: payload.type,
      statement: payload.statement,
      status: payload.status,
      confirmedAt: payload.confirmedAt ? new Date(payload.confirmedAt) : new Date(),
    },
  });

  await createOpsNotificationForDriverAndOps({
    driverId,
    title: "Onam kaydi alindi",
    message: `${payload.type} - Order ${payload.orderId.slice(0, 8)}`,
  });

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: "APP",
    action: "CREATE_DRIVER_CONFIRMATION",
    entityType: "DriverConfirmation",
    entityId: confirmation.id,
    message: `${payload.type} onami kaydedildi`,
    metadata: { orderId: payload.orderId, driverId },
    notifyOps: true,
  });

  return NextResponse.json({ confirmation }, { status: 201 });
}
