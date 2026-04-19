"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, RefreshCw, MapPin, Clock } from "lucide-react";

interface VehicleLocation {
  id: string;
  plateNumber: string;
  brand: string | null;
  model: string | null;
  status: string;
  lastLat: number | null;
  lastLng: number | null;
  lastLocationAt: string | null;
  drivers: { fullName: string }[];
}

const STATUS_LABELS: Record<string, string> = {
  ON_ROUTE: "Rotada",
  AVAILABLE: "Müsait",
  MAINTENANCE: "Bakımda",
  PASSIVE: "Pasif",
};

const STATUS_COLORS: Record<string, string> = {
  ON_ROUTE: "bg-red-500/20 text-red-400 border-red-500/30",
  AVAILABLE: "bg-green-500/20 text-green-400 border-green-500/30",
  MAINTENANCE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  PASSIVE: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Bilinmiyor";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} sa önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
}

// Leaflet haritası yalnızca client-side yüklenir (SSR yok)
const FleetLeafletMap = dynamic(() => import("./fleet-leaflet-map"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

export function VehicleFleetMap() {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch("/api/vehicles/locations");
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    intervalRef.current = setInterval(fetchVehicles, 60000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchVehicles]);

  const handleSeedLocations = async () => {
    setSeeding(true);
    try {
      await fetch("/api/admin/seed-vehicle-locations", { method: "POST" });
      await fetchVehicles();
    } finally {
      setSeeding(false);
    }
  };

  const vehiclesWithLocation = vehicles.filter((v) => v.lastLat && v.lastLng);

  return (
    <Card className="border border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Truck className="h-4 w-4 text-primary" />
          Araçlarım
          <Badge variant="outline" className="text-xs font-normal">
            {vehiclesWithLocation.length}/{vehicles.length} konumlu
          </Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          {vehiclesWithLocation.length === 0 && !loading && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedLocations}
              disabled={seeding}
              className="text-xs h-7"
            >
              {seeding ? "Oluşturuluyor..." : "Test Konumları Ekle"}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchVehicles}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-hidden rounded-b-xl">
        {loading ? (
          <Skeleton className="w-full h-[440px] rounded-b-xl" />
        ) : vehiclesWithLocation.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <MapPin className="h-10 w-10 opacity-30" />
            <p className="text-sm">Henüz araç konum bilgisi yok</p>
            <p className="text-xs opacity-70">
              Şoförler konumlarını güncelledikçe burada görünecek
            </p>
          </div>
        ) : (
          <div className="flex divide-x divide-border/50">
            {/* Interactive Leaflet map */}
            <div className="flex-1 min-w-0" style={{ height: 440 }}>
              <FleetLeafletMap
                vehicles={vehiclesWithLocation}
                selected={selected}
                onSelect={setSelected}
              />
            </div>

            {/* Vehicle list */}
            <div
              className="w-56 shrink-0 flex flex-col divide-y divide-border/30 overflow-y-auto"
              style={{ maxHeight: 440 }}
            >
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelected(v.id === selected ? null : v.id)}
                  className={`w-full text-left p-3 transition-colors hover:bg-muted/30 ${
                    v.id === selected ? "bg-muted/50 border-l-2 border-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-mono text-xs font-semibold tracking-wide text-foreground">
                      {v.plateNumber}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1 py-0 font-normal border ${STATUS_COLORS[v.status] ?? ""}`}
                    >
                      {STATUS_LABELS[v.status] ?? v.status}
                    </Badge>
                  </div>
                  {v.drivers[0] && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {v.drivers[0].fullName}
                    </p>
                  )}
                  {v.lastLocationAt ? (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatTimeAgo(v.lastLocationAt)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/40 mt-1">Konum yok</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
