import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// Test konumları: Türkiye'nin çeşitli şehirlerinde
const TEST_LOCATIONS = [
  { lat: 41.0082, lng: 28.9784 },  // İstanbul
  { lat: 39.9334, lng: 32.8597 },  // Ankara
  { lat: 38.4189, lng: 27.1287 },  // İzmir
  { lat: 36.8969, lng: 30.7133 },  // Antalya
  { lat: 37.0000, lng: 35.3213 },  // Adana
  { lat: 40.1885, lng: 29.0610 },  // Bursa
  { lat: 41.0138, lng: 39.7252 },  // Trabzon
  { lat: 37.7765, lng: 29.0864 },  // Denizli
];

export async function POST(_req: NextRequest) {
  const session = await getCurrentUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vehicles = await prisma.vehicle.findMany({
    select: { id: true, plateNumber: true },
    orderBy: { createdAt: "asc" },
  });

  if (vehicles.length === 0) {
    return NextResponse.json({ message: "Araç bulunamadı" });
  }

  const updates = await Promise.all(
    vehicles.map((v, i) => {
      const loc = TEST_LOCATIONS[i % TEST_LOCATIONS.length];
      // Küçük rastgele sapma ekle
      const jitter = () => (Math.random() - 0.5) * 0.15;
      return prisma.vehicle.update({
        where: { id: v.id },
        data: {
          lastLat: loc.lat + jitter(),
          lastLng: loc.lng + jitter(),
          lastLocationAt: new Date(Date.now() - Math.random() * 3600000),
        },
      });
    })
  );

  return NextResponse.json({
    message: `${updates.length} araça test konumu atandı`,
    count: updates.length,
  });
}
