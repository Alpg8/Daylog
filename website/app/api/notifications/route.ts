import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { recordActivity } from "@/lib/services/activity-log";

export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";

  const notifications = await prisma.notification.findMany({
    where: {
      userId: session.sub,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: session.sub, isRead: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const notification = await prisma.notification.create({
    data: {
      userId: body.userId ?? session.sub,
      title: body.title ?? "",
      message: body.message ?? "",
      type: body.type ?? "INFO",
    },
  });

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: "WEB",
    action: "CREATE_NOTIFICATION",
    entityType: "Notification",
    entityId: notification.id,
    message: "Manuel bildirim olusturuldu",
    metadata: { targetUserId: notification.userId, type: notification.type },
  });

  return NextResponse.json({ notification }, { status: 201 });
}
