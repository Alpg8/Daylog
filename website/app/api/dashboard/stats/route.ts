import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");

  let dateFilter: { gte: Date; lt: Date } | undefined;

  if (yearParam) {
    const year = parseInt(yearParam);
    if (monthParam) {
      const month = parseInt(monthParam); // 1-based
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      dateFilter = { gte: start, lt: end };
    } else {
      dateFilter = { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) };
    }
  }

  const orderWhere = dateFilter ? { createdAt: dateFilter } : {};

  const [
    totalOrders,
    activeOrders,
    totalVehicles,
    totalDrivers,
    pendingNotifications,
    recentFuelRecords,
    monthlyOrders,
  ] = await Promise.all([
    prisma.order.count({ where: orderWhere }),
    prisma.order.count({ where: { ...orderWhere, status: { in: ["PLANNED", "IN_PROGRESS"] } } }),
    prisma.vehicle.count(),
    prisma.driver.count({ where: { isActive: true } }),
    prisma.notification.count({ where: { userId: session.sub, isRead: false } }),
    prisma.fuelRecord.findMany({
      take: 5,
      orderBy: { date: "desc" },
      where: dateFilter ? { date: dateFilter } : undefined,
      include: {
        vehicle: { select: { plateNumber: true } },
        driver: { select: { fullName: true } },
      },
    }),
    // Her ay kaç sipariş: seçili yıl veya bu yıl
    prisma.order.groupBy({
      by: ["createdAt"],
      _count: true,
      where: {
        createdAt: {
          gte: new Date(yearParam ? parseInt(yearParam) : new Date().getFullYear(), 0, 1),
          lt: new Date((yearParam ? parseInt(yearParam) : new Date().getFullYear()) + 1, 0, 1),
        },
      },
    }),
  ]);

  // Aylık grupla (0-11)
  const monthlyCounts = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, count: 0 }));
  for (const row of monthlyOrders) {
    const m = new Date(row.createdAt).getMonth(); // 0-based
    monthlyCounts[m].count += row._count;
  }

  return NextResponse.json({
    totalOrders,
    activeOrders,
    totalVehicles,
    totalDrivers,
    pendingNotifications,
    recentFuelRecords,
    monthlyCounts,
  });
}
