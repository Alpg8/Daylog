import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { notificationService } from "@/lib/services/notification";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notifications = await notificationService.getForUser(session.sub, 30);
  return NextResponse.json({ notifications });
}
