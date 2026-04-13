import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { updateTrailerSchema } from "@/lib/validators/trailer";
import { recordActivity } from "@/lib/services/activity-log";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trailer = await prisma.trailer.findUnique({ where: { id: params.id } });
  if (!trailer) return NextResponse.json({ error: "Trailer not found" }, { status: 404 });
  return NextResponse.json({ trailer });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = updateTrailerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const trailer = await prisma.trailer.update({ where: { id: params.id }, data: parsed.data });

  await recordActivity({
    userId: session.sub,
    role: session.role,
    source: request.headers.get("x-client-source") === "APP" ? "APP" : "WEB",
    action: "UPDATE_TRAILER",
    entityType: "Trailer",
    entityId: trailer.id,
    message: "Dorse kaydi guncellendi",
    metadata: { plateNumber: trailer.plateNumber },
    notifyOps: true,
  });

  return NextResponse.json({ trailer });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await prisma.trailer.delete({ where: { id: params.id } });

    await recordActivity({
      userId: session.sub,
      role: session.role,
      source: "WEB",
      action: "DELETE_TRAILER",
      entityType: "Trailer",
      entityId: params.id,
      message: "Dorse kaydi silindi",
      notifyOps: true,
    });

    return NextResponse.json({ message: "Deleted" });
  } catch {
    return NextResponse.json({ error: "Trailer not found or has related records" }, { status: 400 });
  }
}
