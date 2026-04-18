import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { mapDriverForUserOrFail } from "@/lib/services/driver-operations";
import { recordActivity } from "@/lib/services/activity-log";

// GET — driver fetches their own fuel requests
export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DRIVER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await mapDriverForUserOrFail(session.sub, session.role);
  if (!driver) return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const requests = await prisma.fuelRequest.findMany({
    where: {
      driverId: driver.id,
      ...(status && status !== "all" ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DRIVER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await mapDriverForUserOrFail(session.sub, session.role);
  if (!driver) return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });

  const fullDriver = await prisma.driver.findUnique({
    where: { id: driver.id },
    select: { id: true, assignedVehicleId: true, fullName: true },
  });

  if (!fullDriver?.assignedVehicleId) {
    return NextResponse.json({ error: "Araciniz atanmamis" }, { status: 400 });
  }

  const body = (await request.json()) as {
    km?: number | string;
    tankLeft?: number | string;
    tankRight?: number | string;
    requestedLiters?: number | string | null;
    notes?: string | null;
  };

  const km = Number(String(body.km ?? "").trim());
  const tankLeft = Number(String(body.tankLeft ?? "").trim());
  const tankRight = Number(String(body.tankRight ?? "").trim());
  const requestedLiters = body.requestedLiters ? Number(String(body.requestedLiters).trim()) : null;
  const notes = String(body.notes ?? "").trim();

  if (!Number.isFinite(km) || km <= 0) return NextResponse.json({ error: "KM degeri gecersiz" }, { status: 400 });
  if (!Number.isFinite(tankLeft) || tankLeft < 0) return NextResponse.json({ error: "Sol depo degeri gecersiz" }, { status: 400 });
  if (!Number.isFinite(tankRight) || tankRight < 0) return NextResponse.json({ error: "Sag depo degeri gecersiz" }, { status: 400 });
  if (requestedLiters !== null && (!Number.isFinite(requestedLiters) || requestedLiters <= 0)) return NextResponse.json({ error: "Istenilen litre degeri gecersiz" }, { status: 400 });

  const activeOrder = await prisma.order.findFirst({
    where: { driverId: driver.id, status: { in: ["PLANNED", "IN_PROGRESS"] } },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  const fuelRequest = await prisma.fuelRequest.create({
    data: {
      driverId: driver.id,
      vehicleId: fullDriver.assignedVehicleId,
      orderId: activeOrder?.id ?? null,
      km,
      tankLeft,
      tankRight,
      requestedLiters: requestedLiters ?? null,
      notes: notes || null,
      status: "PENDING",
    },
  });

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: "APP",
    action: "CREATE_FUEL_REQUEST",
    entityType: "FuelRequest",
    entityId: fuelRequest.id,
    message: `Yakit talebi olusturuldu — ${fullDriver.fullName}, KM: ${km}, Sol: ${tankLeft}L, Sag: ${tankRight}L`,
    metadata: { driverId: driver.id, km, tankLeft, tankRight },
    notifyOps: true,
  });

  return NextResponse.json({ request: fuelRequest }, { status: 201 });
}
