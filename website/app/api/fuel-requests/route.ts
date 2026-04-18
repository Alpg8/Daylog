import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

// GET — ops/admin lists all fuel requests (optionally filter by status)
export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "DRIVER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // PENDING | APPROVED | REJECTED | all

  const requests = await prisma.fuelRequest.findMany({
    where: status && status !== "all" ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {},
    include: {
      driver: { select: { id: true, fullName: true, phoneNumber: true } },
      vehicle: { select: { id: true, plateNumber: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ requests });
}
