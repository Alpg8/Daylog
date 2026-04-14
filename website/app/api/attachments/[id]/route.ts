import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteAttachment } from "@/lib/services/attachments";
import { recordActivity } from "@/lib/services/activity-log";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const attachment = await deleteAttachment(params.id);
    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
      action: "DELETE_ATTACHMENT",
      entityType: "Attachment",
      entityId: params.id,
      message: "Dosya silindi",
      metadata: { label: attachment.label, key: attachment.key },
      notifyOps: true,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sunucu hatası" }, { status: 404 });
  }
}