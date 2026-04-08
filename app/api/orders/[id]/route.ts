import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { updateOrderSchema } from "@/lib/validators/order";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      vehicle: true,
      trailer: true,
      driver: true,
      createdByUser: { select: { id: true, name: true, email: true } },
    },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const order = await prisma.order.update({
      where: { id: params.id },
      data: {
        ...data,
        loadingDate: data.loadingDate ? new Date(data.loadingDate) : undefined,
        unloadingDate: data.unloadingDate ? new Date(data.unloadingDate) : undefined,
        operationDate: data.operationDate ? new Date(data.operationDate) : undefined,
      },
      include: {
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true, status: true, usageType: true, ownershipType: true } },
        trailer: { select: { id: true, plateNumber: true, type: true, status: true, notes: true } },
        driver: { select: { id: true, fullName: true, phoneNumber: true, usageType: true, licenseExpiryDate: true, passportExpiryDate: true, psychotechnicExpiryDate: true } },
      },
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[ORDERS PUT]", error);
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
    await prisma.order.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}
