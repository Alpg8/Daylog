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

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Yakit talebi icin gorsel zorunludur" }, { status: 400 });
  }

  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "Dosya boyutu 8MB ustunde" }, { status: 400 });
  }

  const date = String(formData.get("date") ?? "").trim();
  const litersRaw = String(formData.get("liters") ?? "").trim();
  const totalCostRaw = String(formData.get("totalCost") ?? "").trim();
  const fuelStation = String(formData.get("fuelStation") ?? "").trim();
  const startKmRaw = String(formData.get("startKm") ?? "").trim();
  const endKmRaw = String(formData.get("endKm") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const liters = Number(litersRaw);
  const totalCost = totalCostRaw ? Number(totalCostRaw) : null;
  const startKm = startKmRaw ? Number(startKmRaw) : null;
  const endKm = endKmRaw ? Number(endKmRaw) : null;
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

  const storage = getStorageProvider();
  const uploaded = await storage.upload(file, `fuel-requests/${driver.id}`);

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
      notes: notes || null,
    },
  });

  const event = await prisma.driverEvent.create({
    data: {
      orderId: activeOrder.id,
      driverId: driver.id,
      createdById: session.sub,
      type: "WAITING",
      severity: "NORMAL",
      title: "YAKIT_TALEBI",
      notes: `Yakit talebi: ${liters} L${fuelStation ? ` / ${fuelStation}` : ""}`,
    },
    select: { id: true },
  });

  const evidenceEventId = event.id;

  await prisma.driverEventPhoto.create({
    data: {
      eventId: event.id,
      url: uploaded.url,
      key: uploaded.key,
      label: "Yakit fis/foto",
      mimeType: uploaded.mimeType,
      size: uploaded.size,
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
      hasEvidencePhoto: true,
      evidenceEventId,
    },
    notifyOps: true,
  });

  return NextResponse.json({ record, evidenceEventId }, { status: 201 });
}
