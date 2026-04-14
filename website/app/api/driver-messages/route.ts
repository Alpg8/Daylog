import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { recordActivity } from "@/lib/services/activity-log";
import { notificationService } from "@/lib/services/notification";

export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const take = Math.min(parseInt(searchParams.get("take") ?? "200", 10), 500);
  const direction = searchParams.get("direction");
  const isRead = searchParams.get("isRead");
  const driverId = searchParams.get("driverId");

  const messages = await prisma.driverMessage.findMany({
    where: {
      ...(direction ? { direction: direction as "DRIVER_TO_OFFICE" | "OFFICE_TO_DRIVER" } : {}),
      ...(isRead === "true" ? { isRead: true } : {}),
      ...(isRead === "false" ? { isRead: false } : {}),
      ...(driverId ? { driverId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      driver: {
        select: {
          id: true,
          fullName: true,
          phoneNumber: true,
        },
      },
      senderUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      recipientUser: {
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
      direction: "DRIVER_TO_OFFICE",
      isRead: false,
    },
  });

  const drivers = await prisma.driver.findMany({
    where: {
      officeMessages: { some: {} },
      ...(driverId ? { id: driverId } : {}),
    },
    select: {
      id: true,
      fullName: true,
      phoneNumber: true,
      officeMessages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          subject: true,
          message: true,
          createdAt: true,
          direction: true,
          isRead: true,
          senderUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
      _count: {
        select: {
          officeMessages: true,
        },
      },
    },
  });

  const unreadByDriver = await prisma.driverMessage.groupBy({
    by: ["driverId"],
    where: {
      direction: "DRIVER_TO_OFFICE",
      isRead: false,
      ...(driverId ? { driverId } : {}),
    },
    _count: {
      _all: true,
    },
  });

  const unreadByDriverMap = new Map(unreadByDriver.map((item) => [item.driverId, item._count._all]));

  const threads = drivers
    .map((driver) => {
      const latestMessage = driver.officeMessages[0];
      if (!latestMessage) return null;

      return {
        driverId: driver.id,
        driverName: driver.fullName,
        phoneNumber: driver.phoneNumber,
        unreadCount: unreadByDriverMap.get(driver.id) ?? 0,
        messageCount: driver._count.officeMessages,
        lastMessageId: latestMessage.id,
        lastMessageAt: latestMessage.createdAt,
        lastMessage: latestMessage.message,
        lastSubject: latestMessage.subject,
        lastDirection: latestMessage.direction,
        lastIsRead: latestMessage.isRead,
        lastSender: latestMessage.senderUser,
      };
    })
    .filter((thread): thread is NonNullable<typeof thread> => Boolean(thread))
    .sort((left, right) => {
      if (right.unreadCount !== left.unreadCount) return right.unreadCount - left.unreadCount;
      return new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime();
    });

  return NextResponse.json({ messages, unreadCount, threads });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    driverId?: string;
    subject?: string;
    message?: string;
    replyToMessageId?: string;
  };

  const driverId = (body.driverId ?? "").trim();
  const subject = (body.subject ?? "").trim();
  const message = (body.message ?? "").trim();
  const replyToMessageId = (body.replyToMessageId ?? "").trim();

  if (!driverId || !message) {
    return NextResponse.json({ error: "driverId and message are required" }, { status: 400 });
  }

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { id: true, fullName: true, userId: true },
  });

  if (!driver || !driver.userId) {
    return NextResponse.json({ error: "Driver recipient not found" }, { status: 404 });
  }

  const reply = await prisma.driverMessage.create({
    data: {
      driverId: driver.id,
      senderUserId: session.sub,
      recipientUserId: driver.userId,
      subject: subject || null,
      message,
      direction: "OFFICE_TO_DRIVER",
    },
    include: {
      driver: {
        select: { id: true, fullName: true, phoneNumber: true },
      },
      senderUser: {
        select: { id: true, name: true, email: true, role: true },
      },
      recipientUser: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  if (replyToMessageId) {
    await prisma.driverMessage.updateMany({
      where: {
        id: replyToMessageId,
        driverId: driver.id,
        direction: "DRIVER_TO_OFFICE",
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  await notificationService.create(
    driver.userId,
    subject || "Ofisten mesaj var",
    message,
    "INFO"
  );

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: "WEB",
    action: "REPLY_DRIVER_MESSAGE",
    entityType: "DriverMessage",
    entityId: reply.id,
    message: "Ofis surucuye mesaj gonderdi",
    metadata: {
      driverId: driver.id,
      driverName: driver.fullName,
      replyToMessageId: replyToMessageId || null,
      direction: reply.direction,
    },
  });

  return NextResponse.json({ message: reply }, { status: 201 });
}