import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { updateOrderSchema } from "@/lib/validators/order";
import { recordEntityChange } from "@/lib/services/activity-log";

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
  if (session.role !== "ADMIN" && session.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const before = await prisma.order.findUnique({ where: { id: params.id } });
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
        driver: { select: { id: true, fullName: true, phoneNumber: true, usageType: true, licenseExpiryDate: true, passportExpiryDate: true, psychotechnicExpiryDate: true, userId: true } },
      },
    });

    // Track driver assignment history when driver changes
    const newDriverId = data.driverId !== undefined ? data.driverId : before?.driverId;
    if (newDriverId && newDriverId !== before?.driverId) {
      await prisma.orderDriverHistory.create({
        data: {
          orderId: params.id,
          driverId: newDriverId,
          assignedByUserId: session.sub,
        },
      });
    }

    const jobLabel = order.cargoNumber ?? order.tripNumber ?? "İş";

    // Notify newly assigned driver
    const notifyUserId = data.driverId !== undefined ? (order.driver?.userId ?? null) : null;
    const driverTitle = data.driverId !== undefined && data.driverId !== before?.driverId
      ? "Yeni İş Atandı"
      : "İş Güncellendi";
    const driverMessage = data.driverId !== undefined && data.driverId !== before?.driverId
      ? `${jobLabel} numaralı iş size atandı.`
      : `${jobLabel} numaralı işiniz güncellendi. Durum: ${order.status}`;

    await recordEntityChange({
      userId: session.sub,
      role: session.role,
      source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
      action: "UPDATE_ORDER",
      entityType: "Order",
      entityId: order.id,
      message: "Order bilgileri guncellendi",
      metadata: { status: order.status },
      before,
      after: order,
      notifyOps: true,
      notifyDriverUserId: notifyUserId ?? order.driver?.userId ?? null,
      driverTitle,
      driverMessage,
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[ORDERS PUT]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const stringFields = [
      "cargoNumber", "tripNumber", "customerName", "routeText", "notes",
      "referenceNumber", "transportType", "invoiceNumber", "positionNumber",
      // EXPORT
      "customsGate", "sender", "recipient", "loadingCountry", "unloadingCountry",
      // IMPORT
      "supply", "customs", "loadingCity", "unloadingCity", "unloadingWarehouse",
      "orderNumber", "t2MrnNo",
      // DOMESTIC
      "rental", "containerTrailerNo", "containerPickupAddress", "loadUnloadLocation",
      "containerDropAddress", "deliveryCustomer", "supplierInfo", "supplierPhone",
      "equipmentInfo", "cita", "spanzetStanga",
    ];
    const numberFields = [
      "waitingPrice", "freightPrice", "customsCost", "supplyPrice",
      "purchasePrice", "salePrice",
      "freightSalePrice", "waitingCustomsPrice", "customsKantarPrice",
      "supplierSalePrice", "transportProfitRate",
    ];
    const intFields = ["serialNumber", "waitingDays"];

    const patch: Record<string, string | number | null> = {};
    for (const field of stringFields) {
      if (field in body) patch[field] = body[field] === "" ? null : String(body[field]);
    }
    for (const field of numberFields) {
      if (field in body) {
        const val = body[field];
        patch[field] = (val === "" || val === null) ? null : parseFloat(String(val));
      }
    }
    for (const field of intFields) {
      if (field in body) {
        const val = body[field];
        patch[field] = (val === "" || val === null) ? null : parseInt(String(val), 10);
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No patchable fields" }, { status: 400 });
    }
    const before = await prisma.order.findUnique({ where: { id: params.id } });
    const order = await prisma.order.update({ where: { id: params.id }, data: patch });

    await recordEntityChange({
      userId: session.sub,
      role: session.role,
      source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
      action: "PATCH_ORDER",
      entityType: "Order",
      entityId: order.id,
      message: "Order alanlari parcali guncellendi",
      metadata: { updatedFields: Object.keys(patch) },
      before,
      after: order,
      notifyOps: true,
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[ORDERS PATCH]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const before = await prisma.order.findUnique({ where: { id: params.id } });
    await prisma.order.delete({ where: { id: params.id } });

    await recordEntityChange({
      userId: session.sub,
      role: session.role,
      source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
      action: "DELETE_ORDER",
      entityType: "Order",
      entityId: params.id,
      message: "Order silindi",
      before,
      after: null,
      notifyOps: true,
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
}
