import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { isRead?: boolean };
  const nextRead = body.isRead ?? true;

  const updated = await prisma.driverMessage.update({
    where: { id: params.id },
    data: {
      isRead: nextRead,
      readAt: nextRead ? new Date() : null,
    },
  });

  return NextResponse.json({ message: updated });
}