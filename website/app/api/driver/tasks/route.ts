import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  isDriverRole,
  mapDriverForUserOrFail,
} from "@/lib/services/driver-operations";

// Mobile driver app – returns orders assigned to the authenticated driver
export async function GET() {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isDriverRole(session.role)) {
    const driver = await mapDriverForUserOrFail(session.sub, session.role);
    if (!driver) return NextResponse.json({ tasks: [] });

    const tasks = await prisma.order.findMany({
      where: {
        driverId: driver.id,
        status: { in: ["PENDING", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
      },
      select: {
        id: true,
        status: true,
        cargoNumber: true,
        tripNumber: true,
        routeText: true,
        loadingDate: true,
        unloadingDate: true,
        updatedAt: true,
        jobType: true,
        phaseStartLocation: true,
        phaseLoadLocation: true,
        phaseUnloadLocation: true,
        phaseDeliveryLocation: true,
        loadingAddress: true,
        deliveryAddress: true,
        vehicle: { select: { plateNumber: true } },
        trailer: { select: { plateNumber: true } },
        driverEvents: {
          orderBy: { eventAt: "desc" },
          select: {
            type: true,
            eventAt: true,
            photos: {
              take: 1,
              select: { url: true, label: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ tasks });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
