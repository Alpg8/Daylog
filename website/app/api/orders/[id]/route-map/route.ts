import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCurrentUser();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return new NextResponse("Maps key missing", { status: 500 });

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      phaseStartLocation: true,
      loadingAddress: true,
      phaseUnloadLocation: true,
      deliveryAddress: true,
    },
  });

  if (!order) return new NextResponse("Not found", { status: 404 });

  const stops = [
    order.phaseStartLocation,
    order.loadingAddress,
    order.phaseUnloadLocation,
    order.deliveryAddress,
  ].filter((s): s is string => typeof s === "string" && s.trim().length >= 5);

  if (stops.length < 2) return new NextResponse("Not enough locations", { status: 400 });

  // Build Static Maps URL with markers and path
  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("size", "400x400");
  url.searchParams.set("scale", "2");
  url.searchParams.set("zoom", "5");
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("language", "tr");
  url.searchParams.set("key", apiKey);

  // Dark mode styles
  const darkStyles: [string, string][] = [
    ["style", "element:geometry|color:0x212121"],
    ["style", "element:labels.icon|visibility:off"],
    ["style", "element:labels.text.fill|color:0x757575"],
    ["style", "element:labels.text.stroke|color:0x212121"],
    ["style", "feature:administrative|element:geometry|color:0x757575"],
    ["style", "feature:administrative.country|element:labels.text.fill|color:0x9e9e9e"],
    ["style", "feature:administrative.locality|element:labels.text.fill|color:0xbdbdbd"],
    ["style", "feature:poi|element:labels.text.fill|color:0x757575"],
    ["style", "feature:poi.park|element:geometry|color:0x181818"],
    ["style", "feature:poi.park|element:labels.text.fill|color:0x616161"],
    ["style", "feature:poi.park|element:labels.text.stroke|color:0x1b1b1b"],
    ["style", "feature:road|element:geometry.fill|color:0x2c2c2c"],
    ["style", "feature:road|element:labels.text.fill|color:0x8a8a8a"],
    ["style", "feature:road.arterial|element:geometry|color:0x373737"],
    ["style", "feature:road.highway|element:geometry|color:0x3c3c3c"],
    ["style", "feature:road.highway.controlled_access|element:geometry|color:0x4e4e4e"],
    ["style", "feature:road.local|element:labels.text.fill|color:0x616161"],
    ["style", "feature:transit|element:labels.text.fill|color:0x757575"],
    ["style", "feature:water|element:geometry|color:0x000000"],
    ["style", "feature:water|element:labels.text.fill|color:0x3d3d3d"],
  ];
  for (const [k, v] of darkStyles) {
    url.searchParams.append(k, v);
  }

  // Colored markers: start=green, waypoints=blue, end=red
  const colors = ["green", "blue", "blue", "red"];
  const labels = ["A", "B", "C", "D"];
  stops.forEach((stop, i) => {
    const color = colors[Math.min(i, i === stops.length - 1 ? 3 : 1)] ?? "blue";
    const label = labels[i] ?? String(i + 1);
    url.searchParams.append("markers", `color:${color}|label:${label}|${stop}`);
  });

  // Path
  url.searchParams.set("path", `color:0x4F46E5FF|weight:4|${stops.join("|")}`);

  const imgRes = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!imgRes.ok) return new NextResponse("Map fetch failed", { status: 502 });

  const imgBuffer = await imgRes.arrayBuffer();
  return new NextResponse(imgBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
