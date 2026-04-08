import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

// Mobile driver app – returns orders assigned to the authenticated driver
export async function GET() {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Find driver record linked to this user's email or future userId field
  const driver = await prisma.driver.findFirst({
    where: { isActive: true },
    // TODO: link Driver to User model for direct association
  });

  if (!driver) {
    return NextResponse.json({ tasks: [] });
  }

  const tasks = await prisma.order.findMany({
    where: {
      driverId: driver.id,
      status: { in: ["PLANNED", "IN_PROGRESS"] },
    },
    include: {
      vehicle: { select: { plateNumber: true } },
      trailer: { select: { plateNumber: true } },
    },
    orderBy: { loadingDate: "asc" },
  });

  return NextResponse.json({ tasks });
}
