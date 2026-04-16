import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  createDriverEventSchema,
} from "@/lib/validators/driver-operations";
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
  const driverId = searchParams.get("driverId") ?? undefined;
  const take = Math.min(parseInt(searchParams.get("take") ?? "100", 10), 300);

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
  } else if (driverId) {
    where.driverId = driverId;
  }

  const events = await prisma.driverEvent.findMany({
    where,
    include: {
      photos: true,
      driver: { select: { id: true, fullName: true } },
      order: { select: { id: true, cargoNumber: true, tripNumber: true } },
    },
    orderBy: { eventAt: "desc" },
    take,
  });

  return NextResponse.json({ events });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createDriverEventSchema.safeParse(body);

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

  const event = await prisma.driverEvent.create({
    data: {
      orderId: payload.orderId,
      driverId,
      createdById: session.sub,
      type: payload.type,
      severity: payload.severity,
      title: payload.title ?? null,
      notes: payload.notes ?? null,
      odometerKm: payload.odometerKm ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      phaseData: payload.phaseData ? (payload.phaseData as object) : undefined,
      eventAt: payload.eventAt ? new Date(payload.eventAt) : new Date(),
    },
  });

  if (event.type === "START_JOB") {
    await prisma.order.update({
      where: { id: event.orderId },
      data: { status: "IN_PROGRESS" },
    });
  }

  if (event.type === "END_JOB") {
    await prisma.order.update({
      where: { id: event.orderId },
      data: { status: "COMPLETED" },
    });
  }

  await createOpsNotificationForDriverAndOps({
    driverId,
    title: "Saha aksiyonu kaydedildi",
    message: `${event.type} - Order ${payload.orderId.slice(0, 8)}`,
  });

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: "APP",
    action: "CREATE_DRIVER_EVENT",
    entityType: "DriverEvent",
    entityId: event.id,
    message: `${event.type} aksiyonu kaydedildi`,
    metadata: { orderId: event.orderId, driverId: event.driverId },
    notifyOps: true,
  });

  return NextResponse.json({ event }, { status: 201 });
}
