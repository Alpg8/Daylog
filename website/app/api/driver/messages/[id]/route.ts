import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DRIVER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.sub }, select: { id: true } });
  if (!driver) return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });

  const message = await prisma.driverMessage.findFirst({
    where: {
      id: params.id,
      driverId: driver.id,
      senderUserId: session.sub,
      direction: "DRIVER_TO_OFFICE",
    },
    select: { id: true },
  });

  if (!message) {
    return NextResponse.json({ error: "Silinebilecek mesaj bulunamadi" }, { status: 404 });
  }

  await prisma.driverMessage.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}