import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { createDriverSchema } from "@/lib/validators/driver";
import { recordActivity } from "@/lib/services/activity-log";

export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {};
  if (isActive !== null) where.isActive = isActive === "true";
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { phoneNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const drivers = await prisma.driver.findMany({
    where,
    orderBy: { fullName: "asc" },
    include: {
      assignedVehicle: { select: { id: true, plateNumber: true } },
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
  });

  return NextResponse.json({ drivers });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createDriverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const driverCreateData = {
      fullName: data.fullName,
      isActive: data.isActive,
      ...(data.userId ? { userId: data.userId } : {}),
      ...(data.phoneNumber ? { phoneNumber: data.phoneNumber } : {}),
      ...(data.nationalId ? { nationalId: data.nationalId } : {}),
      ...(typeof data.passportRemainingDays === "number" ? { passportRemainingDays: data.passportRemainingDays } : {}),
      ...(data.passportExpiryDate ? { passportExpiryDate: new Date(data.passportExpiryDate) } : {}),
      ...(typeof data.licenseRemainingDays === "number" ? { licenseRemainingDays: data.licenseRemainingDays } : {}),
      ...(data.licenseExpiryDate ? { licenseExpiryDate: new Date(data.licenseExpiryDate) } : {}),
      ...(typeof data.psychotechnicRemainingDays === "number" ? { psychotechnicRemainingDays: data.psychotechnicRemainingDays } : {}),
      ...(data.psychotechnicExpiryDate ? { psychotechnicExpiryDate: new Date(data.psychotechnicExpiryDate) } : {}),
      ...(data.assignedVehicleId ? { assignedVehicleId: data.assignedVehicleId } : {}),
      ...(data.usageType ? { usageType: data.usageType } : {}),
      ...(data.ownershipType ? { ownershipType: data.ownershipType } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
    };

    const driver = await prisma.driver.create({
      data: driverCreateData,
      include: {
        assignedVehicle: { select: { id: true, plateNumber: true } },
        user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      },
    });

    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
      action: "CREATE_DRIVER",
      entityType: "Driver",
      entityId: driver.id,
      message: "Yeni surucu kaydi olusturuldu",
      metadata: { fullName: driver.fullName },
      notifyOps: true,
    });

    return NextResponse.json({ driver }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Bu sürücü kullanıcısı zaten başka bir kayıtla eşleşmiş" }, { status: 409 });
    }
    if ((error as { code?: string }).code === "P2003") {
      return NextResponse.json({ error: "Seçilen kullanıcı veya araç kaydı bulunamadı" }, { status: 400 });
    }
    console.error("[DRIVERS POST]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
