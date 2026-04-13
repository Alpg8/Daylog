"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, ChevronRight, Truck, MapPin, Clock, Bell, Camera, Fuel, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; color: string }> = {
  PLANNED: { label: "Planli", variant: "outline", color: "border-blue-500/40 bg-blue-500/5" },
  IN_PROGRESS: { label: "Devam Ediyor", variant: "default", color: "border-emerald-500/40 bg-emerald-500/5" },
  COMPLETED: { label: "Tamamlandi", variant: "secondary", color: "border-gray-400/40 bg-gray-400/5" },
  CANCELLED: { label: "Iptal", variant: "destructive", color: "border-red-500/40 bg-red-500/5" },
  PENDING: { label: "Beklemede", variant: "outline", color: "border-amber-500/40 bg-amber-500/5" },
};

interface DriverTask {
  id: string;
  status: string;
  cargoNumber: string | null;
  tripNumber: string | null;
  loadingDate: string | null;
  unloadingDate: string | null;
  pickupLocation: string | null;
  companyName: string | null;
  routeText: string | null;
  vehicle?: { plateNumber: string } | null;
  trailer?: { plateNumber: string } | null;
  driverEvents?: Array<{ type: string; eventAt: string }>;
}

export default function DriverHomePage() {
  const [tasks, setTasks] = useState<DriverTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");

  const fetchTasks = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/driver/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
        setLastUpdatedAt(new Date().toISOString());
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(() => fetchTasks(), 15000);
    return () => clearInterval(timer);
  }, [fetchTasks]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted/30" />
        ))}
      </div>
    );
  }

  const activeTasks = tasks.filter((t) => t.status === "PLANNED" || t.status === "IN_PROGRESS");
  const pastTasks = tasks.filter((t) => t.status === "COMPLETED" || t.status === "CANCELLED");
  const activeTaskId = activeTasks[0]?.id;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Toplam Is</p>
            <p className="text-3xl font-bold">{tasks.length}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchTasks(true)}
            disabled={refreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
            <p className="text-xs text-muted-foreground">Aktif</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{activeTasks.length}</p>
          </div>
          <div className="rounded-lg border border-gray-400/30 bg-gray-400/5 p-2.5">
            <p className="text-xs text-muted-foreground">Gecmis</p>
            <p className="text-lg font-bold">{pastTasks.length}</p>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Son guncelleme: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString("tr-TR") : "-"}
        </p>
      </div>

      {/* Active tasks */}
      <div className="grid grid-cols-2 gap-2">
        <QuickLink href="/driver/notifications" icon={Bell} label="Bildirimler" />
        <QuickLink href="/driver/fuel-request" icon={Fuel} label="Yakit Talebi" />
        <QuickLink href={activeTaskId ? `/driver/orders/${activeTaskId}` : "/driver"} icon={Camera} label="Foto Yukle" disabled={!activeTaskId} />
        <QuickLink href={activeTaskId ? `/driver/orders/${activeTaskId}` : "/driver"} icon={Flag} label="Isi Tamamla" disabled={!activeTaskId} />
      </div>

      {activeTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aktif Isler</p>
          {activeTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Past tasks */}
      {pastTasks.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gecmis Isler</p>
          {pastTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Atanmis is bulunamadi.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, disabled = false }: { href: string; icon: React.ElementType; label: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground opacity-60">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <Link href={href} className="flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50">
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Link>
  );
}

function TaskCard({ task }: { task: DriverTask }) {
  const lastEvent = task.driverEvents?.[0];
  const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.PENDING;

  return (
    <Link href={`/driver/orders/${task.id}`}>
      <Card className={`transition-colors active:bg-muted/50 ${cfg.color}`}>
        <CardContent className="p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0">
                  {cfg.label}
                </Badge>
                {lastEvent && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {EVENT_LABELS[lastEvent.type] ?? lastEvent.type}
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold truncate">
                {task.cargoNumber || "Yuk No Yok"}{task.tripNumber ? ` / ${task.tripNumber}` : ""}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {task.vehicle?.plateNumber && (
                  <span className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    {task.vehicle.plateNumber}
                  </span>
                )}
                {task.routeText && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3" />
                    {task.routeText}
                  </span>
                )}
                {lastEvent && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(lastEvent.eventAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
