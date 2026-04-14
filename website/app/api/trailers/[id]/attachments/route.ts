import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listAttachments, uploadAttachment } from "@/lib/services/attachments";
import { recordActivity } from "@/lib/services/activity-log";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const attachments = await listAttachments("trailer", params.id);
    return NextResponse.json({ attachments });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sunucu hatası" }, { status: 404 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const label = String(formData.get("label") ?? "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }

  try {
    const attachment = await uploadAttachment("trailer", params.id, file, label);
    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
      action: "UPLOAD_TRAILER_ATTACHMENT",
      entityType: "Trailer",
      entityId: params.id,
      message: "Dorse dosyasi yuklendi",
      metadata: { attachmentId: attachment.id, label: attachment.label },
      notifyOps: true,
    });
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sunucu hatası" }, { status: 400 });
  }
}