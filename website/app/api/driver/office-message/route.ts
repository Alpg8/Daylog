import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { notificationService } from "@/lib/services/notification";

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DRIVER") {
    return NextResponse.json({ error: "Only drivers can send office messages" }, { status: 403 });
  }

  const body = (await request.json()) as { subject?: string; message?: string };
  const subject = (body.subject ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const recipients = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["ADMIN", "DISPATCHER"] } },
    select: { id: true },
  });

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No active office user found" }, { status: 404 });
  }

  const title = subject || "Surucuden mesaj";
  const sender = session.name || session.email || "Bilinmeyen surucu";
  const payload = `${sender}: ${message}`;

  await Promise.all(
    recipients.map((recipient) =>
      notificationService.create(recipient.id, title, payload, "TASK")
    )
  );

  return NextResponse.json({ ok: true });
}
