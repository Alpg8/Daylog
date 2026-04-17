import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { token, platform } = body;

    if (!token || typeof token !== "string" || token.trim().length < 8) {
      return NextResponse.json({ error: "Geçersiz token" }, { status: 400 });
    }

    const isExpoToken = token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
    const isIos = platform === "ios";

    if (isExpoToken) {
      await prisma.user.update({
        where: { id: session.sub },
        data: { expoPushToken: token, pushPlatform: platform ?? "expo" },
      });
    } else if (isIos) {
      await prisma.user.update({
        where: { id: session.sub },
        data: { apnsDeviceToken: token, pushPlatform: "ios" },
      });
    } else {
      await prisma.user.update({
        where: { id: session.sub },
        data: { expoPushToken: token, pushPlatform: platform ?? "android" },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PUSH_TOKEN]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
