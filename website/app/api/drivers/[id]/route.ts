import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { updateDriverSchema } from "@/lib/validators/driver";
import { recordActivity } from "@/lib/services/activity-log";

async function getDriverIdForUser(userId: string): Promise<string | null> {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    select: { id: true },
  });

  return driver?.id ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role === "DRIVER") {
    const ownDriverId = await getDriverIdForUser(session.sub);
    if (!ownDriverId || ownDriverId !== params.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const driver = await prisma.driver.findUnique({
    where: { id: params.id },
    include: {
      assignedVehicle: true,
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      orders: { take: 5, orderBy: { createdAt: "desc" } },
    },
  });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  return NextResponse.json({ driver });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role === "DRIVER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateDriverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const driver = await prisma.driver.update({
    where: { id: params.id },
    data: {
      ...data,
      passportExpiryDate: data.passportExpiryDate ? new Date(data.passportExpiryDate) : undefined,
      licenseExpiryDate: data.licenseExpiryDate ? new Date(data.licenseExpiryDate) : undefined,
      psychotechnicExpiryDate: data.psychotechnicExpiryDate ? new Date(data.psychotechnicExpiryDate) : undefined,
    },
    include: {
      assignedVehicle: { select: { id: true, plateNumber: true } },
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
  });

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
    action: "UPDATE_DRIVER",
    entityType: "Driver",
    entityId: driver.id,
    message: "Surucu kaydi guncellendi",
    metadata: { fullName: driver.fullName },
    notifyOps: true,
    notifyDriverUserId: driver.user?.id ?? null,
    driverTitle: "Profil Güncellendi",
    driverMessage: "Sürücü profiliniz veya araç atamanız güncellendi.",
  });

  return NextResponse.json({ driver });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role === "DRIVER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.driver.delete({ where: { id: params.id } });

    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: "WEB",
      action: "DELETE_DRIVER",
      entityType: "Driver",
      entityId: params.id,
      message: "Surucu kaydi silindi",
      notifyOps: true,
    });

    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Driver not found or has related records" }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ownDriverId = session.role === "DRIVER" ? await getDriverIdForUser(session.sub) : null;
  if (session.role === "DRIVER" && (!ownDriverId || ownDriverId !== params.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const allowed = session.role === "DRIVER"
      ? ["phoneNumber", "notes"]
      : ["fullName", "phoneNumber", "nationalId", "notes"];
    const patch: Record<string, string> = {};
    for (const field of allowed) {
      if (field in body && typeof body[field] === "string") patch[field] = body[field];
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No patchable fields" }, { status: 400 });
    }
    const driver = await prisma.driver.update({ where: { id: params.id }, data: patch });

    // Ops kendi şoförünü güncelliyorsa (değil de başka birini), şoföre bildir
    const isOwnUpdate = session.role === "DRIVER" && ownDriverId === params.id;

    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
      action: "PATCH_DRIVER",
      entityType: "Driver",
      entityId: driver.id,
      message: "Surucu parcali guncellendi",
      metadata: { updatedFields: Object.keys(patch) },
      notifyOps: true,
      notifyDriverUserId: !isOwnUpdate ? (driver.userId ?? null) : null,
      driverTitle: "Profil Güncellendi",
      driverMessage: "Sürücü profil bilgileriniz güncellendi.",
    });

    return NextResponse.json({ driver });
  } catch (error) {
    console.error("[DRIVERS PATCH]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
