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
        status: { in: ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
      },
      include: {
        vehicle: { select: { plateNumber: true } },
        trailer: { select: { plateNumber: true } },
        driverEvents: {
          orderBy: { eventAt: "desc" },
          take: 1,
          select: { type: true, eventAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ tasks });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
