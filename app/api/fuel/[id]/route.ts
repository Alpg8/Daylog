import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { updateFuelRecordSchema } from "@/lib/validators/fuel";

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
  const record = await prisma.fuelRecord.update({
    where: { id: params.id },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    },
    include: { vehicle: { select: { id: true, plateNumber: true } }, driver: { select: { id: true, fullName: true } } },
  });

  return NextResponse.json({ record });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.fuelRecord.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }
}
