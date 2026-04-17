import { prisma } from "@/lib/db";
import { publishSSE } from "@/lib/services/sse";
import { createSign } from "node:crypto";
import type { NotificationType } from "@/lib/db/prisma-client";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// APNs environment: "development" for dev builds, "production" for App Store / Ad-Hoc
const APNS_HOST = process.env.APNS_PRODUCTION === "true"
  ? "api.push.apple.com"
  : "api.sandbox.push.apple.com";

/** Generate APNs JWT token valid for 30 min */
function generateApnsJwt(teamId: string, keyId: string, privateKey: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId })).toString("base64url");
  const claims = Buffer.from(JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) })).toString("base64url");
  const dataToSign = `${header}.${claims}`;
  const sign = createSign("SHA256");
  sign.update(dataToSign);
  const sig = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${header}.${claims}.${sig}`;
}

async function sendApnsPush(deviceToken: string, title: string, body: string) {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const keyPem = process.env.APNS_KEY_P8; // PEM content of the .p8 file (newlines as \n)
  const bundleId = process.env.APNS_BUNDLE_ID ?? "com.daylog.driver";

  if (!keyId || !teamId || !keyPem) {
    console.warn("[APNS] Missing APNS_KEY_ID / APNS_TEAM_ID / APNS_KEY_P8 env vars");
    return;
  }

  const jwt = generateApnsJwt(teamId, keyId, keyPem);
  const payload = JSON.stringify({
    aps: {
      alert: { title, body },
      sound: "default",
      badge: 1,
    },
  });

  const url = `https://${APNS_HOST}/3/device/${deviceToken}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": bundleId,
        "apns-push-type": "alert",
        "content-type": "application/json",
      },
      body: payload,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[APNS] Error", res.status, text);
    }
  } catch (err) {
    console.error("[APNS] Fetch error", err);
  }
}

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
    select: { expoPushToken: true, apnsDeviceToken: true, pushPlatform: true },
  });

  if (!user) return;

  // If we have a native APNs token, send directly via APNs
  if (user.apnsDeviceToken && user.pushPlatform === "ios") {
    await sendApnsPush(user.apnsDeviceToken, title, body);
    return;
  }

  // Fall back to Expo push service
  if (!user.expoPushToken) return;

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
