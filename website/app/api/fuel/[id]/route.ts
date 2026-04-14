import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { updateFuelRecordSchema } from "@/lib/validators/fuel";
import { recordEntityChange } from "@/lib/services/activity-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const record = await prisma.fuelRecord.findUnique({
    where: { id: params.id },
    include: { vehicle: true, driver: true },
  });
  if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });
  return NextResponse.json({ record });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = updateFuelRecordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const before = await prisma.fuelRecord.findUnique({ where: { id: params.id } });
  const record = await prisma.fuelRecord.update({
    where: { id: params.id },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    },
    include: { vehicle: { select: { id: true, plateNumber: true } }, driver: { select: { id: true, fullName: true } } },
  });

  await recordEntityChange({
    userId: session.sub,
    role: session.role,
    source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
    action: "UPDATE_FUEL_RECORD",
    entityType: "FuelRecord",
    entityId: record.id,
    message: "Yakıt kaydi guncellendi",
    metadata: { vehicleId: record.vehicleId },
    before,
    after: record,
    notifyOps: true,
  });

  return NextResponse.json({ record });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const before = await prisma.fuelRecord.findUnique({ where: { id: params.id } });
    await prisma.fuelRecord.delete({ where: { id: params.id } });

    await recordEntityChange({
      userId: session.sub,
      role: session.role,
      source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
      action: "DELETE_FUEL_RECORD",
      entityType: "FuelRecord",
      entityId: params.id,
      message: "Yakıt kaydi silindi",
      before,
      after: null,
      notifyOps: true,
    });

    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
}
