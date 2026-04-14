import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DRIVER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });

  if (!driver) {
    return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(parseInt(searchParams.get("take") ?? "100", 10), 200);

  const messages = await prisma.driverMessage.findMany({
    where: {
      driverId: driver.id,
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      senderUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  const unreadCount = await prisma.driverMessage.count({
    where: {
      driverId: driver.id,
      direction: "OFFICE_TO_DRIVER",
      isRead: false,
    },
  });

  return NextResponse.json({ messages, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DRIVER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: session.sub },
    select: { id: true },
  });

  if (!driver) {
    return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
  }

  const body = (await request.json()) as { markAll?: boolean; id?: string };

  if (body.markAll) {
    await prisma.driverMessage.updateMany({
      where: {
        driverId: driver.id,
        direction: "OFFICE_TO_DRIVER",
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.id) {
    await prisma.driverMessage.updateMany({
      where: {
        id: body.id,
        driverId: driver.id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "id or markAll required" }, { status: 400 });
}