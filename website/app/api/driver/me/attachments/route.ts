import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { listAttachments, uploadAttachment } from "@/lib/services/attachments";
import { recordActivity } from "@/lib/services/activity-log";

async function requireDriver(userId: string) {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    select: { id: true, fullName: true },
  });

  if (!driver) {
    throw new Error("Driver profile not found");
  }

  return driver;
}

export async function GET() {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DRIVER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const driver = await requireDriver(session.sub);
    const attachments = await listAttachments("driver", driver.id);
    return NextResponse.json({ attachments });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sunucu hatası" }, { status: 404 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DRIVER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  const label = String(formData.get("label") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  try {
    const driver = await requireDriver(session.sub);
    const attachment = await uploadAttachment("driver", driver.id, file, label);

    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
      action: "UPLOAD_DRIVER_ATTACHMENT",
      entityType: "Driver",
      entityId: driver.id,
      message: "Surucu kendi dosyasini yukledi",
      metadata: { attachmentId: attachment.id, label: attachment.label, driverName: driver.fullName },
      notifyOps: true,
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sunucu hatası" }, { status: 400 });
  }
}