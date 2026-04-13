import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";
import {
  isDriverRole,
  isOpsViewer,
  mapDriverForUserOrFail,
} from "@/lib/services/driver-operations";
import { recordActivity } from "@/lib/services/activity-log";

const updateStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["PENDING", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  if (isDriverRole(session.role)) {
    const driver = await mapDriverForUserOrFail(session.sub, session.role);
    if (!driver) return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });

    const ownOrder = await prisma.order.findFirst({
      where: { id: parsed.data.orderId, driverId: driver.id },
      select: { id: true },
    });

    if (!ownOrder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!isOpsViewer(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const order = await prisma.order.update({
    where: { id: parsed.data.orderId },
    data: { status: parsed.data.status },
  });

  // Ops bir şoförün işini güncelliyorsa şoföre bildirim gönder
  let driverUserId: string | null | undefined;
  if (!isDriverRole(session.role) && order.driverId) {
    const driverRec = await prisma.driver.findUnique({
      where: { id: order.driverId },
      select: { userId: true },
    });
    driverUserId = driverRec?.userId;
  }

  const statusLabel: Record<string, string> = {
    PENDING: "Beklemede",
    PLANNED: "Planlandı",
    IN_PROGRESS: "Yolda",
    COMPLETED: "Tamamlandı",
    CANCELLED: "İptal Edildi",
  };

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: isDriverRole(session.role) ? "APP" : "WEB",
    action: "UPDATE_ORDER_STATUS",
    entityType: "Order",
    entityId: order.id,
    message: `Order durumu ${parsed.data.status} olarak guncellendi`,
    metadata: { status: parsed.data.status },
    notifyOps: true,
    notifyDriverUserId: driverUserId ?? null,
    driverTitle: "Görev Durumu Güncellendi",
    driverMessage: `İşinizin durumu "${statusLabel[parsed.data.status] ?? parsed.data.status}" olarak güncellendi.`,
  });

  return NextResponse.json({ order });
}
