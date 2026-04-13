"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  ImageIcon,
  MapPin,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const CONFIRMATION_LABELS: Record<string, string> = {
  JOB_STARTED: "Ise basladigini onayladi",
  LOADING_CONFIRMED: "Yuklemeyi onayladi",
  DELIVERY_CONFIRMED: "Teslimi onayladi",
  VEHICLE_HANDED_OVER: "Araci devretti",
  DELIVERY_RECEIVED: "Teslim aldi",
  DOCUMENT_UPLOADED: "Evraki yukledi",
  DAMAGE_CONFIRMED: "Hasar bilgisini onayladi",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planli",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandi",
  CANCELLED: "Iptal",
  PENDING: "Beklemede",
};

const SEVERITY_COLORS: Record<string, string> = {
  NORMAL: "border-primary bg-primary/20",
  WARNING: "border-amber-500 bg-amber-500/20",
  CRITICAL: "border-red-500 bg-red-500/20",
};

interface TimelineResponse {
  order: {
    id: string;
    status: string;
    cargoNumber: string | null;
    tripNumber: string | null;
    routeText: string | null;
    driver?: { id: string; fullName: string } | null;
    vehicle?: { plateNumber: string } | null;
    trailer?: { plateNumber: string } | null;
    driverEvents: Array<{
      id: string;
      type: string;
      severity: string;
      eventAt: string;
      notes: string | null;
      odometerKm: number | null;
      driver: { id: string; fullName: string };
      photos: Array<{ id: string; url: string; label: string | null }>;
    }>;
    driverConfirmations: Array<{
      id: string;
      type: string;
      statement: string;
      status: string;
      confirmedAt: string;
    }>;
    handovers: Array<{
      id: string;
      status: string;
      handoverAt: string;
      notes: string | null;
      fromDriver: { fullName: string };
      toDriver: { fullName: string } | null;
    }>;
  };
  warnings: Array<{ code: string; message: string }>;
}

export default function OrderOperationsDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<TimelineResponse | null>(null);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/driver/orders/${params.id}/timeline`);
    if (res.ok) {
      setData((await res.json()) as TimelineResponse);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 12000);
    return () => clearInterval(timer);
  }, [fetchData]);

  if (!data) return <p className="text-sm text-muted-foreground">Yukleniyor...</p>;

  const order = data.order;
  const totalPhotos = order.driverEvents.reduce((n, e) => n + e.photos.length, 0);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Operasyon Detayi</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {order.cargoNumber || "Yuk No Yok"}{order.tripNumber ? ` / Sefer: ${order.tripNumber}` : ""}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={order.status === "COMPLETED" ? "secondary" : "default"}>{STATUS_LABELS[order.status] ?? order.status}</Badge>
            </div>
            {order.driver && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Link href={`/drivers/${order.driver.id}`} className="text-primary underline">{order.driver.fullName}</Link>
              </div>
            )}
            {order.vehicle && (
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-muted-foreground" /> {order.vehicle.plateNumber}
              </div>
            )}
            {order.routeText && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" /> {order.routeText}
              </div>
            )}
          </div>

          {/* Summary stats */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <div className="rounded-lg border p-2 text-center">
              <p className="text-lg font-bold">{order.driverEvents.length}</p>
              <p className="text-[10px] text-muted-foreground">Aksiyon</p>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <p className="text-lg font-bold">{totalPhotos}</p>
              <p className="text-[10px] text-muted-foreground">Fotograf</p>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <p className="text-lg font-bold">{order.driverConfirmations.length}</p>
              <p className="text-[10px] text-muted-foreground">Onam</p>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <p className="text-lg font-bold">{order.handovers.length}</p>
              <p className="text-[10px] text-muted-foreground">Devir</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" /> Eksik Islem Kontrolu ({data.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.warnings.map((w, i) => (
                <div key={`${w.code}-${i}`} className="flex items-center gap-2 rounded border border-amber-500/20 bg-background p-2 text-sm">
                  <Badge variant="outline" className="text-[10px] shrink-0">{w.code.replace("MISSING_", "")}</Badge>
                  <span className="text-xs">{w.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Event Timeline ({order.driverEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.driverEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henuz aksiyon yok.</p>
          ) : (
            <div className="relative space-y-0">
              {order.driverEvents.map((event, idx) => (
                <div key={event.id} className="relative pl-8 pb-4">
                  {idx < order.driverEvents.length - 1 && <div className="absolute left-[11px] top-5 bottom-0 w-px bg-border" />}
                  <div className={`absolute left-0 top-1 h-[22px] w-[22px] rounded-full border-2 ${SEVERITY_COLORS[event.severity] ?? SEVERITY_COLORS.NORMAL}`} />
                  <div className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{EVENT_LABELS[event.type] ?? event.type}</Badge>
                        <span className="text-muted-foreground">{event.driver.fullName}</span>
                        {event.photos.length > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <ImageIcon className="h-3 w-3" /> {event.photos.length}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(event.eventAt).toLocaleString("tr-TR")}</span>
                    </div>
                    {event.odometerKm && <p className="text-xs text-muted-foreground mt-0.5">Km: {event.odometerKm}</p>}
                    {event.notes && <p className="mt-1 text-muted-foreground">{event.notes}</p>}
                    {event.photos.length > 0 && (
                      <div className="mt-2 grid grid-cols-4 gap-2 lg:grid-cols-6">
                        {event.photos.map((photo) => (
                          <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-lg border">
                            <img src={photo.url} alt={photo.label || "Event foto"} className="h-20 w-full object-cover transition-transform group-hover:scale-105" />
                            {photo.label && <span className="absolute bottom-0 inset-x-0 bg-black/50 px-1 py-0.5 text-[10px] text-white truncate">{photo.label}</span>}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Onam Kayitlari ({order.driverConfirmations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.driverConfirmations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Onam kaydi yok.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {order.driverConfirmations.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      {CONFIRMATION_LABELS[item.type] ?? item.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(item.confirmedAt).toLocaleString("tr-TR")}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.statement}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Handovers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Devir Teslim ({order.handovers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {order.handovers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Devir teslim kaydi yok.</p>
          ) : (
            <div className="space-y-2">
              {order.handovers.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.status}</Badge>
                      <span>{item.fromDriver.fullName} → {item.toDriver?.fullName || "Belirtilmedi"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(item.handoverAt).toLocaleString("tr-TR")}</span>
                  </div>
                  {item.notes && <p className="mt-1 text-muted-foreground">{item.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
