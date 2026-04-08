import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    totalOrders,
    activeOrders,
    totalVehicles,
    totalDrivers,
    pendingNotifications,
    recentFuelRecords,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ["PLANNED", "IN_PROGRESS"] } } }),
    prisma.vehicle.count(),
    prisma.driver.count({ where: { isActive: true } }),
    prisma.notification.count({ where: { userId: session.sub, isRead: false } }),
    prisma.fuelRecord.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: {
        vehicle: { select: { plateNumber: true } },
        driver: { select: { fullName: true } },
      },
    }),
  ]);

  return NextResponse.json({
    totalOrders,
    activeOrders,
    totalVehicles,
    totalDrivers,
    pendingNotifications,
    recentFuelRecords,
  });
}
