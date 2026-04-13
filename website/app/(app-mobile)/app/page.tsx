"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Camera, ChevronRight, Flag, Fuel, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DriverTask {
  id: string;
  status: string;
  cargoNumber: string | null;
  tripNumber: string | null;
  routeText: string | null;
  vehicle?: { plateNumber: string } | null;
  driverEvents?: Array<{ type: string; eventAt: string }>;
}

export default function AppHomePage() {
  const [tasks, setTasks] = useState<DriverTask[]>([]);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/driver/tasks", {
      headers: { "x-client-source": "APP" },
    });

    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks ?? []);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(fetchTasks, 12000);
    return () => clearInterval(timer);
  }, [fetchTasks]);

  const activeTasks = tasks.filter((t) => t.status === "PLANNED" || t.status === "IN_PROGRESS");
  const activeTaskId = activeTasks[0]?.id;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card p-3">
        <p className="text-xs text-muted-foreground">Surucu Gorev Ozeti</p>
        <div className="mt-1 flex items-end justify-between">
          <p className="text-2xl font-semibold">{tasks.length}</p>
          <Badge variant="outline">Aktif: {activeTasks.length}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <QuickLink href="/app/notifications" icon={Bell} label="Bildirimler" />
        <QuickLink href="/app/fuel-request" icon={Fuel} label="Yakit Talebi" />
        <QuickLink href={activeTaskId ? `/driver/orders/${activeTaskId}` : "/app"} icon={Camera} label="Foto Yukle" disabled={!activeTaskId} />
        <QuickLink href={activeTaskId ? `/driver/orders/${activeTaskId}` : "/app"} icon={Flag} label="Isi Tamamla" disabled={!activeTaskId} />
      </div>

      {tasks.map((task) => (
        <Card key={task.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{task.cargoNumber || "Yuk No Yok"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{task.status}</Badge>
              {task.driverEvents?.[0] ? <Badge variant="secondary">Son: {task.driverEvents[0].type}</Badge> : null}
            </div>
            <p>Sefer: {task.tripNumber || "-"}</p>
            <p className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {task.routeText || "-"}</p>
            {task.vehicle?.plateNumber && <p className="flex items-center gap-1 text-muted-foreground"><Truck className="h-3.5 w-3.5" /> {task.vehicle.plateNumber}</p>}
            <Button asChild className="w-full">
              <Link href={`/driver/orders/${task.id}`}>Detay Ac</Link>
            </Button>
          </CardContent>
        </Card>
      ))}

      {tasks.length === 0 ? <p className="text-sm text-muted-foreground">Atanmis is yok.</p> : null}
    </div>
  );
}

function QuickLink({ href, icon: Icon, label, disabled = false }: { href: string; icon: React.ElementType; label: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground opacity-60">
        <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {label}</span>
      </div>
    );
  }

  return (
    <Link href={href} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50">
      <span className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {label}</span>
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}
