import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { updateVehicleSchema } from "@/lib/validators/vehicle";
import { recordActivity } from "@/lib/services/activity-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vehicle = await prisma.vehicle.findUnique({ where: { id: params.id }, include: { drivers: true } });
  if (!vehicle) return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  return NextResponse.json({ vehicle });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = updateVehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const vehicle = await prisma.vehicle.update({ where: { id: params.id }, data: parsed.data });

    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
      action: "UPDATE_VEHICLE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      message: "Arac kaydi guncellendi",
      metadata: { plateNumber: vehicle.plateNumber },
      notifyOps: true,
    });

    return NextResponse.json({ vehicle });
  } catch {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const allowed = ["plateNumber", "brand", "model", "notes"];
    const patch: Record<string, string> = {};
    for (const field of allowed) {
      if (field in body && typeof body[field] === "string") patch[field] = body[field];
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No patchable fields" }, { status: 400 });
    }
    const vehicle = await prisma.vehicle.update({ where: { id: params.id }, data: patch });

    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
      action: "PATCH_VEHICLE",
      entityType: "Vehicle",
      entityId: vehicle.id,
      message: "Arac parcali guncellendi",
      metadata: { updatedFields: Object.keys(patch) },
      notifyOps: true,
    });

    return NextResponse.json({ vehicle });
  } catch (error) {
    console.error("[VEHICLES PATCH]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.vehicle.delete({ where: { id: params.id } });

    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: "WEB",
      action: "DELETE_VEHICLE",
      entityType: "Vehicle",
      entityId: params.id,
      message: "Arac kaydi silindi",
      notifyOps: true,
    });

    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Vehicle not found or has related records" }, { status: 400 });
  }
}
