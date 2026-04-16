import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/lib/services/storage";
import {
  createOpsNotificationForDriverAndOps,
  isDriverRole,
  isOpsViewer,
  mapDriverForUserOrFail,
} from "@/lib/services/driver-operations";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.driverEvent.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      driverId: true,
      type: true,
      orderId: true,
      order: { select: { cargoNumber: true, tripNumber: true } },
      driver: { select: { fullName: true } },
    },
  });

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  if (isDriverRole(session.role)) {
    const driver = await mapDriverForUserOrFail(session.sub, session.role);
    if (!driver || driver.id !== event.driverId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (!isOpsViewer(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const label = formData.get("label");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const maxBytes = 8 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: "File too large" }, { status: 400 });
  }

  const storage = getStorageProvider();
  const uploaded = await storage.upload(file, `driver-events/${event.id}`);

  const photo = await prisma.driverEventPhoto.create({
    data: {
      eventId: event.id,
      url: uploaded.url,
      key: uploaded.key,
      label: typeof label === "string" && label.length > 0 ? label : null,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
    },
  });

  // Notify ops + driver about new photo
  const EVENT_LABELS_TR: Record<string, string> = {
    START_JOB: "İş Başlat",
    LOAD: "Yükleme",
    UNLOAD: "Boşaltma",
    DELIVERY: "Teslim",
    END_JOB: "İş Bitti",
  };
  const phaseLabel = EVENT_LABELS_TR[event.type] ?? event.type;
  const orderRef = event.order?.cargoNumber ?? event.order?.tripNumber ?? event.orderId.slice(0, 8);
  const photoLabel = photo.label ? ` (${photo.label})` : "";

  await createOpsNotificationForDriverAndOps({
    driverId: event.driverId,
    title: `${event.driver?.fullName ?? "Sürücü"} — Fotoğraf Yükledi`,
    message: `${orderRef} | ${phaseLabel} aşaması${photoLabel} fotoğrafı yüklendi`,
  });

  return NextResponse.json({ photo }, { status: 201 });
}
