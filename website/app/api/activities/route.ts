import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(parseInt(searchParams.get("take") ?? "100", 10), 300);
  const source = searchParams.get("source");
  const entityType = searchParams.get("entityType");

  const logs = await prisma.userActivityLog.findMany({
    where: {
      ...(source ? { source: source as "WEB" | "APP" | "SYSTEM" } : {}),
      ...(entityType ? { entityType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return NextResponse.json({ logs });
}
