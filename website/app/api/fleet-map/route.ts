import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await getCurrentUser();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return new NextResponse("Maps key missing", { status: 500 });

  const vehicles = await prisma.vehicle.findMany({
    where: {
      lastLat: { not: null },
      lastLng: { not: null },
    },
    select: {
      id: true,
      plateNumber: true,
      status: true,
      lastLat: true,
      lastLng: true,
      lastLocationAt: true,
    },
  });

  if (vehicles.length === 0) {
    return new NextResponse("No vehicle locations", { status: 404 });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("size", "800x400");
  url.searchParams.set("scale", "2");
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("language", "tr");
  url.searchParams.set("key", apiKey);

  // Dark mode styles
  const darkStyles: string[] = [
    "element:geometry|color:0x212121",
    "element:labels.icon|visibility:off",
    "element:labels.text.fill|color:0x757575",
    "element:labels.text.stroke|color:0x212121",
    "feature:administrative|element:geometry|color:0x757575",
    "feature:administrative.country|element:labels.text.fill|color:0x9e9e9e",
    "feature:administrative.locality|element:labels.text.fill|color:0xbdbdbd",
    "feature:poi|element:labels.text.fill|color:0x757575",
    "feature:poi.park|element:geometry|color:0x181818",
    "feature:road|element:geometry.fill|color:0x2c2c2c",
    "feature:road|element:labels.text.fill|color:0x8a8a8a",
    "feature:road.arterial|element:geometry|color:0x373737",
    "feature:road.highway|element:geometry|color:0x3c3c3c",
    "feature:water|element:geometry|color:0x000000",
    "feature:water|element:labels.text.fill|color:0x3d3d3d",
  ];
  for (const s of darkStyles) {
    url.searchParams.append("style", s);
  }

  // Markers for each vehicle
  const statusColor: Record<string, string> = {
    ON_ROUTE: "red",
    AVAILABLE: "green",
    MAINTENANCE: "orange",
    PASSIVE: "gray",
  };

  for (const v of vehicles) {
    const color = statusColor[v.status] ?? "blue";
    const label = v.plateNumber.replace(/\s/g, "").slice(-2).toUpperCase();
    url.searchParams.append(
      "markers",
      `color:${color}|label:${label}|${v.lastLat},${v.lastLng}`
    );
  }

  const imgRes = await fetch(url.toString(), { cache: "no-store" });
  if (!imgRes.ok) return new NextResponse("Map fetch failed", { status: 502 });

  const imgBuffer = await imgRes.arrayBuffer();
  return new NextResponse(imgBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
