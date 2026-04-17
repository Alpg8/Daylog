import { prisma } from "@/lib/db";
import { publishSSE } from "@/lib/services/sse";
import type { NotificationType } from "@/lib/db/prisma-client";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export const notificationService = {
  async create(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = "INFO"
  ) {
    const notification = await prisma.notification.create({
      data: { userId, title, message, type },
    });

    // Emit real-time event via SSE
    emitNotification(userId, { title, message, type });

    // Send Expo push notification if user has a registered token
    sendExpoPush(userId, title, message).catch((err) =>
      console.error("[EXPO_PUSH]", err)
    );

    return notification;
  },

  async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  },

  async getForUser(userId: string, limit = 50) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};

/**
 * Real-time notification emitter via SSE.
 */
export function emitNotification(
  userId: string,
  notification: { title: string; message: string; type: NotificationType }
) {
  publishSSE(userId, { event: "notification", ...notification });

  if (process.env.NODE_ENV === "development") {
    console.log(`[Notification → ${userId}]`, notification.title);
  }
  // TODO: socketServer.to(userId).emit('notification', notification);
}

/**
 * Send a push notification via Expo Push API.
 */
async function sendExpoPush(userId: string, title: string, body: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { expoPushToken: true },
  });

  if (!user?.expoPushToken) return;

  const token = user.expoPushToken;

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify({
      to: token,
      sound: "default",
      title,
      body,
      data: { type: "job_assignment" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[EXPO_PUSH] HTTP error", res.status, text);
  } else {
    const json = await res.json();
    if (json?.data?.status === "error") {
      console.error("[EXPO_PUSH] Push error", json.data.message);
    }
  }
}
