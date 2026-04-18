import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "DRIVER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = (await request.json()) as { action: "approve" | "reject"; note?: string };

  if (!body.action || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }

  const fuelRequest = await prisma.fuelRequest.findUnique({
    where: { id },
    include: {
      driver: { select: { id: true, fullName: true, userId: true } },
    },
  });

  if (!fuelRequest) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (fuelRequest.status !== "PENDING") {
    return NextResponse.json({ error: "Talep zaten islendi" }, { status: 409 });
  }

  const newStatus = body.action === "approve" ? "APPROVED" : "REJECTED";

  await prisma.fuelRequest.update({
    where: { id },
    data: {
      status: newStatus,
      reviewedBy: session.sub,
      reviewedAt: new Date(),
    },
  });

  // Send in-app notification to driver if they have a user account
  if (fuelRequest.driver.userId) {
    const isApproved = newStatus === "APPROVED";
    await prisma.notification.create({
      data: {
        userId: fuelRequest.driver.userId,
        title: isApproved ? "Yakıt Talebi Onaylandı ✅" : "Yakıt Talebi Reddedildi ❌",
        message: isApproved
          ? `Yakıt talebiniz onaylandı. Yakıt alabilirsiniz.${body.note ? ` Not: ${body.note}` : ""}`
          : `Yakıt talebiniz reddedildi.${body.note ? ` Sebep: ${body.note}` : ""}`,
        type: isApproved ? "SUCCESS" : "WARNING",
      },
    });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
