import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Geçersiz token" }, { status: 400 });
    }

    // Validate Expo push token format
    if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
      return NextResponse.json({ error: "Geçersiz Expo push token formatı" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.sub },
      data: { expoPushToken: token },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PUSH_TOKEN]", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
