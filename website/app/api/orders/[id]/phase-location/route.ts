import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { z } from "zod";

const phaseLocationSchema = z.object({
  phase: z.enum(["START_JOB", "LOAD", "UNLOAD", "DELIVERY"]),
  location: z.string().min(1),
});

const phaseFieldMap = {
  START_JOB: "phaseStartLocation",
  LOAD: "phaseLoadLocation",
  UNLOAD: "phaseUnloadLocation",
  DELIVERY: "phaseDeliveryLocation",
} as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["ADMIN", "OPS"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const result = phaseLocationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });
  }

  const { phase, location } = result.data;
  const field = phaseFieldMap[phase];

  const order = await prisma.order.update({
    where: { id: params.id },
    data: { [field]: location },
    select: {
      id: true,
      phaseStartLocation: true,
      phaseLoadLocation: true,
      phaseUnloadLocation: true,
      phaseDeliveryLocation: true,
    },
  });

  return NextResponse.json({ order });
}
