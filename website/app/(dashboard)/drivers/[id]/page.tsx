"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  CheckCircle2,
  Clock,
  ImageIcon,
  Phone,
  RefreshCw,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const EVENT_LABELS: Record<string, string> = {
  START_JOB: "Is Basladi",
  LOAD: "Yukleme",
  UNLOAD: "Bosaltma",
  DELIVERY: "Teslim",
  WAITING: "Bekleme",
  ISSUE: "Sorun",
  HANDOVER: "Devir Teslim",
  END_JOB: "Is Bitti",
  START_SHIFT: "Vardiya Basladi",
  END_SHIFT: "Vardiya Bitti",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planli",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandi",
  CANCELLED: "Iptal",
  PENDING: "Beklemede",
};

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  IN_PROGRESS: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  COMPLETED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  CANCELLED: "bg-red-500/10 text-red-700 border-red-500/30",
};

interface DriverData {
  driver: {
    id: string;
    fullName: string;
    phoneNumber: string | null;
    isActive: boolean;
    orders: Array<{ id: string; cargoNumber: string | null; status: string }>;
  };
}

interface EventData {
  events: Array<{
    id: string;
    type: string;
    severity: string;
    eventAt: string;
    notes: string | null;
    order: { id: string; cargoNumber: string | null; tripNumber: string | null };
    photos: Array<{ id: string; url: string }>;
  }>;
}

export default function DriverActivityPage() {
  const params = useParams<{ id: string }>();
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [events, setEvents] = useState<EventData["events"]>([]);

  const fetchData = useCallback(async () => {
    const [driverRes, eventsRes] = await Promise.all([
      fetch(`/api/drivers/${params.id}`),
      fetch(`/api/driver/events?driverId=${params.id}&take=30`),
    ]);

    if (driverRes.ok) {
      setDriverData((await driverRes.json()) as DriverData);
    }

    if (eventsRes.ok) {
      const data = (await eventsRes.json()) as EventData;
      setEvents(data.events ?? []);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 12000);
    return () => clearInterval(timer);
  }, [fetchData]);

  if (!driverData) return <p className="text-sm text-muted-foreground">Yukleniyor...</p>;

  const activeOrders = driverData.driver.orders.filter((o) => o.status === "IN_PROGRESS" || o.status === "PLANNED");
  const pastOrders = driverData.driver.orders.filter((o) => o.status !== "IN_PROGRESS" && o.status !== "PLANNED");
  const totalPhotos = events.reduce((n, e) => n + e.photos.length, 0);
  const issueCount = events.filter((e) => e.severity === "CRITICAL" || e.type === "ISSUE").length;

  return (
    <div className="space-y-4">
      {/* Driver Info */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle>Surucu Detay</CardTitle>
          <Button variant="ghost" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
              {driverData.driver.fullName.charAt(0)}
            </div>
            <div>
              <p className="text-base font-semibold">{driverData.driver.fullName}</p>
              {driverData.driver.phoneNumber && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" /> {driverData.driver.phoneNumber}
                </p>
              )}
            </div>
            <Badge variant={driverData.driver.isActive ? "default" : "secondary"} className="ml-auto">
              {driverData.driver.isActive ? "Aktif" : "Pasif"}
            </Badge>
          </div>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <div className="rounded-lg border p-2 text-center">
              <p className="text-lg font-bold">{driverData.driver.orders.length}</p>
              <p className="text-[10px] text-muted-foreground">Toplam Is</p>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <p className="text-lg font-bold">{events.length}</p>
              <p className="text-[10px] text-muted-foreground">Aksiyon</p>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <p className="text-lg font-bold">{totalPhotos}</p>
              <p className="text-[10px] text-muted-foreground">Fotograf</p>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <p className={`text-lg font-bold ${issueCount > 0 ? "text-red-600" : ""}`}>{issueCount}</p>
              <p className="text-[10px] text-muted-foreground">Sorun</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> Aktif Isler ({activeOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeOrders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{order.cargoNumber || "Yuk No Yok"}</span>
                  <Badge variant="outline" className={STATUS_COLORS[order.status] ?? ""}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Past Orders */}
      {pastOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gecmis Isler ({pastOrders.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pastOrders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{order.cargoNumber || "Yuk No Yok"}</span>
                  <Badge variant="outline" className={STATUS_COLORS[order.status] ?? ""}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Son Aktiviteler ({events.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aktivite kaydi yok.</p>
          ) : (
            <div className="relative space-y-0">
              {events.map((event, idx) => (
                <div key={event.id} className="relative pl-8 pb-4">
                  {idx < events.length - 1 && <div className="absolute left-[11px] top-5 bottom-0 w-px bg-border" />}
                  <div className={`absolute left-0 top-1 h-[22px] w-[22px] rounded-full border-2 ${
                    event.severity === "CRITICAL" ? "border-red-500 bg-red-500/20" :
                    event.severity === "WARNING" ? "border-amber-500 bg-amber-500/20" :
                    "border-primary bg-primary/20"
                  }`} />
                  <div className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{EVENT_LABELS[event.type] ?? event.type}</Badge>
                        <Link href={`/orders/${event.order.id}`} className="text-xs text-primary underline">
                          {event.order.cargoNumber || event.order.tripNumber || "Siparis"}
                        </Link>
                        {event.photos.length > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <ImageIcon className="h-3 w-3" /> {event.photos.length}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(event.eventAt).toLocaleString("tr-TR")}</span>
                    </div>
                    {event.notes && <p className="mt-1 text-muted-foreground">{event.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
