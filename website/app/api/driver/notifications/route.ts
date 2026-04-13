import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { notificationService } from "@/lib/services/notification";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    notificationService.getForUser(session.sub, 50),
    notificationService.getUnreadCount(session.sub),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, markAll } = body as { id?: string; markAll?: boolean };

  if (markAll) {
    await notificationService.markAllAsRead(session.sub);
    return NextResponse.json({ ok: true });
  }

  if (id && typeof id === "string") {
    await notificationService.markAsRead(id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "id or markAll required" }, { status: 400 });
}
