import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vehicles = await prisma.vehicle.findMany({
    select: {
      id: true,
      plateNumber: true,
      brand: true,
      model: true,
      status: true,
      lastLat: true,
      lastLng: true,
      lastLocationAt: true,
      drivers: {
        select: { fullName: true },
        where: { isActive: true },
        take: 1,
      },
    },
    orderBy: { plateNumber: "asc" },
  });

  return NextResponse.json(vehicles);
}
