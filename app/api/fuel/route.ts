import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { createFuelRecordSchema } from "@/lib/validators/fuel";

export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get("vehicleId");
  const driverId = searchParams.get("driverId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50");

  const where: Record<string, unknown> = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (driverId) where.driverId = driverId;

  const [records, total] = await Promise.all([
    prisma.fuelRecord.findMany({
      where,
      include: {
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true, status: true } },
        driver: { select: { id: true, fullName: true, phoneNumber: true, usageType: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.fuelRecord.count({ where }),
  ]);

  return NextResponse.json({ records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createFuelRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const record = await prisma.fuelRecord.create({
      data: {
        ...data,
        date: new Date(data.date),
        // Auto-compute distanceKm if start/end provided
        distanceKm:
          data.distanceKm ??
          (data.startKm != null && data.endKm != null ? data.endKm - data.startKm : null),
      },
      include: {
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true, status: true } },
        driver: { select: { id: true, fullName: true, phoneNumber: true, usageType: true } },
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    console.error("[FUEL POST]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
