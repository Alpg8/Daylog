import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "DRIVER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: session.sub },
    select: {
      id: true,
      fullName: true,
      phoneNumber: true,
      notes: true,
      isActive: true,
      assignedVehicleId: true,
      assignedVehicle: {
        select: {
          id: true,
          plateNumber: true,
        },
      },
    },
  });

  if (!driver) {
    return NextResponse.json({ error: "Driver profile not found" }, { status: 404 });
  }

  if (!driver.isActive) {
    return NextResponse.json({ error: "Driver profile is inactive" }, { status: 403 });
  }

  const [orderStats, totalFuelRecords, recentJobs, groupedByVehicle] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      where: { driverId: driver.id },
      _count: { _all: true },
    }),
    prisma.fuelRecord.count({ where: { driverId: driver.id } }),
    prisma.order.findMany({
      where: { driverId: driver.id },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        cargoNumber: true,
        tripNumber: true,
        status: true,
        updatedAt: true,
        vehicle: { select: { plateNumber: true } },
      },
    }),
    prisma.order.groupBy({
      by: ["vehicleId"],
      where: { driverId: driver.id, vehicleId: { not: null } },
      _count: { _all: true },
      _max: { updatedAt: true },
    }),
  ]);

  const vehicleIds = groupedByVehicle
    .map((item) => item.vehicleId)
    .filter((id): id is string => Boolean(id));

  const vehicles = vehicleIds.length
    ? await prisma.vehicle.findMany({
        where: { id: { in: vehicleIds } },
        select: { id: true, plateNumber: true },
      })
    : [];

  const plateById = new Map(vehicles.map((v) => [v.id, v.plateNumber]));

  const vehicleHistory = groupedByVehicle
    .filter((item) => item.vehicleId)
    .map((item) => ({
      vehicleId: item.vehicleId as string,
      plateNumber: plateById.get(item.vehicleId as string) ?? "Bilinmeyen Arac",
      jobCount: item._count._all,
      lastUsedAt: (item._max.updatedAt ?? new Date()).toISOString(),
    }))
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());

  const totalJobs = orderStats.reduce((sum, row) => sum + row._count._all, 0);
  const completedJobs = orderStats
    .filter((row) => row.status === "COMPLETED")
    .reduce((sum, row) => sum + row._count._all, 0);

  const stats = { totalJobs, completedJobs, totalFuelRecords };

  const recentJobsPayload = recentJobs.map((job) => ({
    id: job.id,
    cargoNumber: job.cargoNumber,
    tripNumber: job.tripNumber,
    status: job.status,
    vehiclePlate: job.vehicle?.plateNumber ?? null,
    updatedAt: job.updatedAt.toISOString(),
  }));

  return NextResponse.json({
    driver,
    vehicleHistory,
    recentJobs: recentJobsPayload,
    stats,
  });
}
