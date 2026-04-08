"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, Truck, Users, TrendingUp, Bell, Fuel } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalOrders: number;
  activeOrders: number;
  totalVehicles: number;
  totalDrivers: number;
  pendingNotifications: number;
  recentFuelRecords: Array<{
    id: string;
    date: string | Date;
    liters: number;
    vehicle?: { plateNumber: string };
  }>;
}

export function StatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/dashboard/stats");
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  );

  if (!stats) return null;

  const cards = [
    { title: "Toplam Sefer", value: stats.totalOrders, icon: Package, description: "Tüm seferler" },
    { title: "Aktif Sefer", value: stats.activeOrders, icon: TrendingUp, description: "Devam eden" },
    { title: "Araç", value: stats.totalVehicles, icon: Truck, description: "Kayıtlı araçlar" },
    { title: "Sürücü", value: stats.totalDrivers, icon: Users, description: "Kayıtlı sürücüler" },
    { title: "Bildirim", value: stats.pendingNotifications, icon: Bell, description: "Okunmamış" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map(card => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/50">{card.title}</CardTitle>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-white/10">
                <card.icon className="h-4 w-4 text-blue-300" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{card.value}</div>
              <p className="text-xs text-white/30 mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {stats.recentFuelRecords.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Fuel className="h-4 w-4 text-blue-300" />
            <CardTitle className="text-sm font-medium text-white/70">Son Yakıt Kayıtları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentFuelRecords.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white/80">{r.vehicle?.plateNumber ?? "-"}</span>
                  <span className="text-white/40">{r.liters.toFixed(1)} L</span>
                  <span className="text-white/40">{new Date(r.date).toLocaleDateString("tr-TR")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
