import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { recordActivity } from "@/lib/services/activity-log";
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

  const driver = await prisma.driver.findUnique({
    where: { userId: session.sub },
    select: { id: true, fullName: true },
  });

  if (!driver) {
    return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
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

  const driverMessage = await prisma.driverMessage.create({
    data: {
      driverId: driver.id,
      senderUserId: session.sub,
      subject: subject || null,
      message,
      direction: "DRIVER_TO_OFFICE",
    },
  });

  await Promise.all(
    recipients.map((recipient: typeof recipients[number]) =>
      notificationService.create(recipient.id, title, payload, "TASK")
    )
  );

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
    action: "SEND_DRIVER_MESSAGE",
    entityType: "DriverMessage",
    entityId: driverMessage.id,
    message: "Surucu merkeze mesaj gonderdi",
    metadata: {
      driverId: driver.id,
      driverName: driver.fullName,
      subject: driverMessage.subject,
      recipientCount: recipients.length,
      contentLength: message.length,
      direction: driverMessage.direction,
    },
  });

  return NextResponse.json({ ok: true, messageId: driverMessage.id }, { status: 201 });
}
