import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import type { OrderStatus } from "@/lib/db/prisma-client";
import { getCurrentUser } from "@/lib/auth/session";
import { syncOperationTasksForOrder } from "@/lib/services/operation-task-queue";

export async function GET(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "DISPATCHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get("driverId") ?? undefined;
  const orderStatus = searchParams.get("orderStatus") ?? undefined;

  const filteredStatuses: OrderStatus[] = orderStatus && orderStatus !== "ALL"
    ? [orderStatus as OrderStatus]
    : ["PLANNED", "IN_PROGRESS"];

  const orderWhere = {
    status: { in: filteredStatuses },
    driverId: driverId && driverId !== "ALL" ? driverId : { not: null },
  };

  const [activeOrders, activeDrivers, unresolvedIssues, recentEvents, activeOrderRows] = await Promise.all([
    prisma.order.count({ where: orderWhere }),
    prisma.driver.count({ where: { isActive: true } }),
    prisma.driverEvent.count({ where: { type: "ISSUE", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.driverEvent.findMany({
      take: 20,
      orderBy: { eventAt: "desc" },
      include: {
        driver: { select: { id: true, fullName: true } },
        order: { select: { id: true, cargoNumber: true, tripNumber: true, status: true } },
      },
    }),
    prisma.order.findMany({
      where: orderWhere,
      include: {
        driver: { select: { id: true, fullName: true } },
      },
      take: 100,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const orderIds = activeOrderRows.map((order) => order.id);

  const [latestEvents, timelineRows] = orderIds.length
    ? await Promise.all([
        prisma.driverEvent.findMany({
          where: { orderId: { in: orderIds } },
          orderBy: { eventAt: "desc" },
          select: {
            id: true,
            orderId: true,
            eventAt: true,
            type: true,
            photos: { select: { id: true } },
          },
        }),
        prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: {
            id: true,
            status: true,
            driverEvents: {
              select: {
                type: true,
                photos: { select: { id: true } },
              },
            },
          },
        }),
      ])
    : [[], []];

  for (const row of timelineRows) {
    await syncOperationTasksForOrder({
      orderId: row.id,
      driverId: activeOrderRows.find((order) => order.id === row.id)?.driver?.id ?? null,
      warnings: [],
    });
  }

  const latestByOrder = new Map<string, (typeof latestEvents)[number]>();
  for (const event of latestEvents) {
    if (!latestByOrder.has(event.orderId)) {
      latestByOrder.set(event.orderId, event);
    }
  }

  const tracking = activeOrderRows.map((order) => {
    const latest = latestByOrder.get(order.id);

    return {
      orderId: order.id,
      orderStatus: order.status,
      cargoNumber: order.cargoNumber,
      tripNumber: order.tripNumber,
      driver: order.driver,
      lastActionType: latest?.type ?? null,
      lastActionAt: latest?.eventAt ?? null,
      hasPhotoOnLastAction: latest ? latest.photos.length > 0 : false,
    };
  });

  const openTaskCount = await prisma.operationTask.count({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
  });

  return NextResponse.json({
    cards: {
      activeOrders,
      activeDrivers,
      unresolvedIssues,
      recentEventCount: recentEvents.length,
      openTaskCount,
    },
    recentEvents,
    tracking,
    serverTime: new Date().toISOString(),
  });
}
