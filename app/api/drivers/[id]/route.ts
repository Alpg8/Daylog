import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { updateDriverSchema } from "@/lib/validators/driver";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const driver = await prisma.driver.findUnique({
    where: { id: params.id },
    include: { assignedVehicle: true, orders: { take: 5, orderBy: { createdAt: "desc" } } },
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
    include: { assignedVehicle: { select: { id: true, plateNumber: true } } },
  });

  return NextResponse.json({ driver });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.driver.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Driver not found or has related records" }, { status: 400 });
  }
}
