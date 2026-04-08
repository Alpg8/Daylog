import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { createDriverSchema } from "@/lib/validators/driver";

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
    include: { assignedVehicle: { select: { id: true, plateNumber: true } } },
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
    const driver = await prisma.driver.create({
      data: {
        ...data,
        passportExpiryDate: data.passportExpiryDate ? new Date(data.passportExpiryDate) : null,
        licenseExpiryDate: data.licenseExpiryDate ? new Date(data.licenseExpiryDate) : null,
        psychotechnicExpiryDate: data.psychotechnicExpiryDate ? new Date(data.psychotechnicExpiryDate) : null,
      },
      include: { assignedVehicle: { select: { id: true, plateNumber: true } } },
    });

    return NextResponse.json({ driver }, { status: 201 });
  } catch (error) {
    console.error("[DRIVERS POST]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
