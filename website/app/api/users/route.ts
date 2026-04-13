import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { createUserSchema } from "@/lib/validators/user";
import { hashPassword } from "@/lib/auth/passwords";
import { recordActivity } from "@/lib/services/activity-log";

export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { password, ...rest } = parsed.data;
    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { ...rest, passwordHash },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: "WEB",
      action: "CREATE_USER",
      entityType: "User",
      entityId: user.id,
      message: "Yeni kullanici olusturuldu",
      metadata: { role: user.role, email: user.email },
      notifyOps: true,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Bu e-posta adresi zaten kayıtlı" }, { status: 409 });
    }
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
