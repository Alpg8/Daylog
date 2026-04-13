import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { createHandoverSchema } from "@/lib/validators/driver-operations";
import {
  assertDriverOrderAccess,
  createOpsNotificationForDriverAndOps,
  isDriverRole,
  isOpsViewer,
  mapDriverForUserOrFail,
} from "@/lib/services/driver-operations";
import { recordActivity } from "@/lib/services/activity-log";

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createHandoverSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  let fromDriverId: string | null = null;

  if (isDriverRole(session.role)) {
    const driver = await mapDriverForUserOrFail(session.sub, session.role);
    if (!driver) return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });

    const allowedOrder = await assertDriverOrderAccess(session.sub, session.role, payload.orderId);
    if (!allowedOrder) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    fromDriverId = driver.id;
  } else if (isOpsViewer(session.role)) {
    const order = await prisma.order.findUnique({
      where: { id: payload.orderId },
      select: { driverId: true },
    });
    fromDriverId = order?.driverId ?? null;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!fromDriverId) {
    return NextResponse.json({ error: "Order has no assigned driver" }, { status: 400 });
  }

  const handover = await prisma.handover.create({
    data: {
      orderId: payload.orderId,
      fromDriverId,
      toDriverId: payload.toDriverId ?? null,
      notes: payload.notes ?? null,
      status: payload.status,
      handoverAt: payload.handoverAt ? new Date(payload.handoverAt) : new Date(),
    },
  });

  await prisma.driverEvent.create({
    data: {
      orderId: payload.orderId,
      driverId: fromDriverId,
      createdById: session.sub,
      type: "HANDOVER",
      severity: "NORMAL",
      title: "Devir teslim",
      notes: payload.notes ?? null,
    },
  });

  await createOpsNotificationForDriverAndOps({
    driverId: fromDriverId,
    title: "Devir teslim olusturuldu",
    message: `Order ${payload.orderId.slice(0, 8)} icin devir teslim yapildi`,
  });

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: "APP",
    action: "CREATE_HANDOVER",
    entityType: "Handover",
    entityId: handover.id,
    message: "Devir teslim islemi kaydedildi",
    metadata: { orderId: payload.orderId, fromDriverId },
    notifyOps: true,
  });

  return NextResponse.json({ handover }, { status: 201 });
}
