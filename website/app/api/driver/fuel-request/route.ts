import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getStorageProvider } from "@/lib/services/storage";
import { mapDriverForUserOrFail } from "@/lib/services/driver-operations";
import { recordActivity } from "@/lib/services/activity-log";

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
    date?: string;
    liters?: number | string;
    totalCost?: number | string | null;
    fuelStation?: string | null;
    startKm?: number | string | null;
    endKm?: number | string | null;
    tankRight?: number | string | null;
    tankLeft?: number | string | null;
    notes?: string | null;
  };

  const date = String(body.date ?? "").trim();
  const litersRaw = String(body.liters ?? "").trim();
  const totalCostRaw = String(body.totalCost ?? "").trim();
  const fuelStation = String(body.fuelStation ?? "").trim();
  const startKmRaw = String(body.startKm ?? "").trim();
  const endKmRaw = String(body.endKm ?? "").trim();
  const tankRightRaw = String(body.tankRight ?? "").trim();
  const tankLeftRaw = String(body.tankLeft ?? "").trim();
  const notes = String(body.notes ?? "").trim();

  const liters = Number(litersRaw);
  const totalCost = totalCostRaw ? Number(totalCostRaw) : null;
  const startKm = startKmRaw ? Number(startKmRaw) : null;
  const endKm = endKmRaw ? Number(endKmRaw) : null;
  const tankRight = tankRightRaw ? Number(tankRightRaw) : null;
  const tankLeft = tankLeftRaw ? Number(tankLeftRaw) : null;
  const tankTotal = (tankRight ?? 0) + (tankLeft ?? 0) || null;
  const distanceKm =
    startKm != null && endKm != null && Number.isFinite(startKm) && Number.isFinite(endKm) && endKm > startKm
      ? endKm - startKm
      : null;

  if (!date) return NextResponse.json({ error: "Tarih gerekli" }, { status: 400 });
  if (!Number.isFinite(liters) || liters <= 0) {
    return NextResponse.json({ error: "Litre degeri gecersiz" }, { status: 400 });
  }

  const activeOrder = await prisma.order.findFirst({
    where: {
      driverId: driver.id,
      status: { in: ["PLANNED", "IN_PROGRESS"] },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (!activeOrder) {
    return NextResponse.json({ error: "Yakit talebi icin aktif is bulunamadi" }, { status: 400 });
  }

  const record = await prisma.fuelRecord.create({
    data: {
      vehicleId: fullDriver.assignedVehicleId,
      driverId: driver.id,
      date: new Date(date),
      fuelStation: fuelStation || null,
      liters,
      totalCost,
      startKm,
      endKm,
      distanceKm,
      tankRight,
      tankLeft,
      tankTotal,
      notes: notes || null,
    },
  });

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: "APP",
    action: "CREATE_FUEL_RECORD",
    entityType: "FuelRecord",
    entityId: record.id,
    message: "Yakit talebi olusturuldu",
    metadata: {
      driverId: driver.id,
      liters,
      tankRight,
      tankLeft,
      distanceKm,
    },
    notifyOps: true,
  });

  return NextResponse.json({ record }, { status: 201 });
}
