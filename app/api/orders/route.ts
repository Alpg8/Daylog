import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { createOrderSchema } from "@/lib/validators/order";

export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50");

  const where: Record<string, unknown> = {};
  if (category) where.orderCategory = category;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { customerName: { contains: search, mode: "insensitive" } },
      { companyName: { contains: search, mode: "insensitive" } },
      { cargoNumber: { contains: search, mode: "insensitive" } },
      { tripNumber: { contains: search, mode: "insensitive" } },
      { referenceNumber: { contains: search, mode: "insensitive" } },
    ];
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true, status: true, usageType: true, ownershipType: true } },
        trailer: { select: { id: true, plateNumber: true, type: true, status: true, notes: true } },
        driver: { select: { id: true, fullName: true, phoneNumber: true, usageType: true, licenseExpiryDate: true, passportExpiryDate: true, psychotechnicExpiryDate: true } },
        createdByUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const order = await prisma.order.create({
      data: {
        ...data,
        loadingDate: data.loadingDate ? new Date(data.loadingDate) : null,
        unloadingDate: data.unloadingDate ? new Date(data.unloadingDate) : null,
        operationDate: data.operationDate ? new Date(data.operationDate) : null,
        createdByUserId: session.sub,
      },
      include: {
        vehicle: { select: { id: true, plateNumber: true, brand: true, model: true, status: true, usageType: true, ownershipType: true } },
        trailer: { select: { id: true, plateNumber: true, type: true, status: true, notes: true } },
        driver: { select: { id: true, fullName: true, phoneNumber: true, usageType: true, licenseExpiryDate: true, passportExpiryDate: true, psychotechnicExpiryDate: true } },
      },
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("[ORDERS POST]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
