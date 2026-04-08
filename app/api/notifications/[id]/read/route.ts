import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const notification = await prisma.notification.update({
      where: { id: params.id, userId: session.sub },
      data: { isRead: true },
    });
    return NextResponse.json({ notification });
  } catch {
    return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  }
}
