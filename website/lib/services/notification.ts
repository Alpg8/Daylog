import { prisma } from "@/lib/db";
import { publishSSE } from "@/lib/services/sse";
import type { NotificationType } from "@/lib/db/prisma-client";

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

    // Emit real-time event (stub – wire up SSE/WebSocket later)
    emitNotification(userId, { title, message, type });

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
