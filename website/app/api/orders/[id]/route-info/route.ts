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

  const order = await prisma.order.findUnique({
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

  // Estimated completion: find START_JOB event time if in progress
  const startEvent = order.driverEvents.find((e) => e.type === "START_JOB");
  let estimatedCompletion: string | null = null;
  if (startEvent) {
    const startTime = new Date(startEvent.eventAt).getTime();
    estimatedCompletion = new Date(startTime + totalDurationS * 1000).toISOString();
  } else if (order.status === "PLANNED") {
    // From now
    estimatedCompletion = new Date(Date.now() + totalDurationS * 1000).toISOString();
  }

  return NextResponse.json({
    distanceText,
    durationText,
    totalDistanceM,
    totalDurationS,
    estimatedCompletion,
    legs: legs.map((l) => ({
      distance: l.distance.text,
      duration: l.duration.text,
    })),
  });
}
