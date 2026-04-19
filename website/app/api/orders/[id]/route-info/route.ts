import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

interface DirectionsLeg {
  distance: { text: string; value: number };
  duration: { text: string; value: number };
}

interface DirectionsRoute {
  legs: DirectionsLeg[];
}

interface DirectionsResponse {
  status: string;
  routes: DirectionsRoute[];
  error_message?: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Maps API key not configured" }, { status: 500 });

  let order: {
    phaseStartLocation: string | null;
    loadingAddress: string | null;
    phaseUnloadLocation: string | null;
    deliveryAddress: string | null;
    status: string;
    driverEvents: { type: string; eventAt: Date }[];
  } | null = null;

  try {
    order = await prisma.order.findUnique({
      where: { id: params.id },
      select: {
        phaseStartLocation: true,
        loadingAddress: true,
        phaseUnloadLocation: true,
        deliveryAddress: true,
        status: true,
        driverEvents: {
          select: { type: true, eventAt: true },
          orderBy: { eventAt: "asc" },
        },
      },
    });
  } catch (err) {
    console.error("[route-info] DB error:", err);
    return NextResponse.json({ error: "Veritabanı hatası" }, { status: 500 });
  }

  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stops = [
    order.phaseStartLocation,
    order.loadingAddress,
    order.phaseUnloadLocation,
    order.deliveryAddress,
  ].filter(Boolean) as string[];

  if (stops.length < 2) {
    return NextResponse.json({ error: "Not enough locations" }, { status: 400 });
  }

  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1);

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  if (waypoints.length > 0) {
    url.searchParams.set("waypoints", waypoints.join("|"));
  }
  url.searchParams.set("travelmode", "driving");
  url.searchParams.set("language", "tr");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    return NextResponse.json({ error: "Maps API request failed" }, { status: 502 });
  }

  const data = (await res.json()) as DirectionsResponse;

  if (data.status !== "OK" || !data.routes?.[0]) {
    return NextResponse.json({ error: data.error_message ?? data.status }, { status: 422 });
  }

  const legs = data.routes[0].legs;
  const totalDistanceM = legs.reduce((s, l) => s + l.distance.value, 0);
  const totalDurationS = legs.reduce((s, l) => s + l.duration.value, 0);

  // Format distance
  const distanceText =
    totalDistanceM >= 1000
      ? `${(totalDistanceM / 1000).toFixed(0)} km`
      : `${totalDistanceM} m`;

  // Format duration as hours/minutes
  const hours = Math.floor(totalDurationS / 3600);
  const minutes = Math.floor((totalDurationS % 3600) / 60);
  const durationText =
    hours > 0 ? `${hours} sa ${minutes} dk` : `${minutes} dk`;

  // Determine remaining legs based on current phase
  // stops[0]→[1] = leg 0 (yükleme), [1]→[2] = leg 1 (boşaltma), [2]→[3] = leg 2 (teslim)
  // Phase progression: START_JOB → LOAD_DONE → UNLOAD_DONE → END_JOB
  const eventTypes = order.driverEvents.map((e) => e.type as string);
  let completedLegs = 0;
  if (eventTypes.includes("UNLOAD_DONE")) {
    completedLegs = Math.min(legs.length - 1, stops.length - 2);
  } else if (eventTypes.includes("LOAD_DONE")) {
    completedLegs = Math.min(1, legs.length - 1);
  } else if (eventTypes.includes("START_JOB")) {
    completedLegs = 0;
  }

  const remainingLegs = legs.slice(completedLegs);
  const remainingDurationS = remainingLegs.reduce((s, l) => s + l.duration.value, 0);

  // Find the most recent phase-transition event time as the "from" time
  const phaseEventOrder = ["UNLOAD_DONE", "LOAD_DONE", "START_JOB"];
  let latestPhaseEvent: (typeof order.driverEvents)[0] | undefined;
  for (const type of phaseEventOrder) {
    latestPhaseEvent = order.driverEvents.filter((e) => (e.type as string) === type).at(-1);
    if (latestPhaseEvent) break;
  }

  let estimatedCompletion: string | null = null;
  if (order.status === "COMPLETED") {
    estimatedCompletion = null;
  } else if (latestPhaseEvent) {
    // From the last completed phase event timestamp
    const fromTime = new Date(latestPhaseEvent.eventAt).getTime();
    estimatedCompletion = new Date(fromTime + remainingDurationS * 1000).toISOString();
  } else {
    // Not started yet — estimate from now
    estimatedCompletion = new Date(Date.now() + totalDurationS * 1000).toISOString();
  }

  // Remaining duration text
  const remHours = Math.floor(remainingDurationS / 3600);
  const remMinutes = Math.floor((remainingDurationS % 3600) / 60);
  const remainingDurationText =
    remHours > 0 ? `${remHours} sa ${remMinutes} dk` : `${remMinutes} dk`;

  return NextResponse.json({
    distanceText,
    durationText,
    totalDistanceM,
    totalDurationS,
    remainingDurationS,
    remainingDurationText,
    estimatedCompletion,
    legs: legs.map((l) => ({
      distance: l.distance.text,
      duration: l.duration.text,
    })),
  });
}
