import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { listAttachments, uploadAttachment } from "@/lib/services/attachments";
import { recordActivity } from "@/lib/services/activity-log";

async function requireDriverOrder(orderId: string, userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId }, select: { id: true, fullName: true } });
  if (!driver) throw new Error("Driver profile not found");

  const order = await prisma.order.findFirst({
    where: { id: orderId, driverId: driver.id },
    select: { id: true, cargoNumber: true, tripNumber: true },
  });
  if (!order) throw new Error("Order not found");
  return { driver, order };
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DRIVER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await requireDriverOrder(params.id, session.sub);
    const attachments = await listAttachments("order", params.id);
    return NextResponse.json({ attachments });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sunucu hatası" }, { status: 404 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DRIVER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { driver, order } = await requireDriverOrder(params.id, session.sub);
    const formData = await request.formData();
    const file = formData.get("file");
    const label = String(formData.get("label") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    const attachment = await uploadAttachment("order", params.id, file, label);
    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: "APP",
      action: "UPLOAD_ORDER_ATTACHMENT",
      entityType: "Order",
      entityId: params.id,
      message: "Surucu is dokumani yukledi",
      metadata: {
        attachmentId: attachment.id,
        driverId: driver.id,
        orderRef: order.cargoNumber ?? order.tripNumber ?? params.id,
      },
      notifyOps: true,
    });
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sunucu hatası" }, { status: 400 });
  }
}