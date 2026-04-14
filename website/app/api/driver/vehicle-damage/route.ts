import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { notificationService } from "@/lib/services/notification";
import { recordActivity } from "@/lib/services/activity-log";

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "DRIVER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as { title?: string; description?: string };
  const title = body.title?.trim();
  const description = body.description?.trim();

  if (!title || !description) {
    return NextResponse.json({ error: "Baslik ve aciklama gerekli" }, { status: 400 });
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: session.sub },
    select: {
      id: true,
      fullName: true,
      assignedVehicle: { select: { id: true, plateNumber: true, brand: true, model: true } },
    },
  });

  if (!driver?.assignedVehicle) {
    return NextResponse.json({ error: "Surucuye atanmis arac bulunamadi" }, { status: 400 });
  }

  const assignedVehicle = driver.assignedVehicle;

  const opsUsers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "DISPATCHER"] }, isActive: true },
    select: { id: true },
  });

  await Promise.all(
    opsUsers.map((user) =>
      notificationService.create(
        user.id,
        `Arac Hasar Bildirimi: ${assignedVehicle.plateNumber}`,
        `${driver.fullName} - ${title}: ${description}`,
        "WARNING"
      )
    )
  );

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: "APP",
    action: "REPORT_VEHICLE_DAMAGE",
    entityType: "Vehicle",
    entityId: assignedVehicle.id,
    message: "Surucu arac hasar bildirimi gonderdi",
    metadata: {
      driverId: driver.id,
      title,
      description,
      plateNumber: assignedVehicle.plateNumber,
    },
    notifyOps: false,
  });

  return NextResponse.json({ ok: true });
}