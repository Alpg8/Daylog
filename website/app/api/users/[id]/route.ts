import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { updateUserSchema } from "@/lib/validators/user";
import { hashPassword } from "@/lib/auth/passwords";
import { recordActivity } from "@/lib/services/activity-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { password, ...rest } = parsed.data;
  const updateData: Record<string, unknown> = { ...rest };
  if (password) {
    updateData.passwordHash = await hashPassword(password);
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: "WEB",
    action: "UPDATE_USER",
    entityType: "User",
    entityId: user.id,
    message: "Kullanici guncellendi",
    metadata: { role: user.role, isActive: user.isActive },
    notifyOps: true,
  });

  return NextResponse.json({ user });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Prevent deleting your own account
  if (params.id === session.sub) {
    return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });

    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: "WEB",
      action: "DELETE_USER",
      entityType: "User",
      entityId: params.id,
      message: "Kullanici silindi",
      notifyOps: true,
    });

    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
