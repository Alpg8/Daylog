"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Truck, Users, TrendingUp, Bell, Fuel, RefreshCw, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

interface MonthlyStat { month: number; count: number; }

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
  monthlyCounts: MonthlyStat[];
}

interface LiveOpsCards {
  activeOrders: number;
  activeDrivers: number;
  unresolvedIssues: number;
  recentEventCount: number;
  missingPhotoOrders: number;
  missingConfirmationOrders: number;
  missingCloseoutOrders: number;
}

const LIVE_UPDATE_EVENT = "daylog:live-update";

export function StatsCards() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [liveOps, setLiveOps] = useState<LiveOpsCards | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>(String(CURRENT_YEAR));
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ year: selectedYear });
    if (selectedMonth !== "all") params.set("month", selectedMonth);
    const [statsRes, liveOpsRes] = await Promise.all([
      fetch(`/api/dashboard/stats?${params}`),
      fetch("/api/live-operations/summary"),
    ]);

    if (statsRes.ok) setStats(await statsRes.json());
    if (liveOpsRes.ok) {
      const liveData = await liveOpsRes.json();
      setLiveOps(liveData.cards ?? null);
    } else {
      setLiveOps(null);
    }
    setLoading(false);
  }, [selectedYear, selectedMonth]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    const handleLiveUpdate = () => {
      void fetchStats();
    };

    window.addEventListener(LIVE_UPDATE_EVENT, handleLiveUpdate);
    return () => window.removeEventListener(LIVE_UPDATE_EVENT, handleLiveUpdate);
  }, [fetchStats]);

  const handleRefresh = () => {
    router.refresh();
    fetchStats();
  };

  const periodLabel = selectedMonth === "all"
    ? `${selectedYear} yılı`
    : `${MONTHS[parseInt(selectedMonth) - 1]} ${selectedYear}`;

  if (loading) return (
    <div className="space-y-6">
      <div className="flex gap-2 items-center">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-9" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    </div>
  );

  if (!stats) return null;

  const cards = [
    {
      title: "Toplam Sefer", value: stats.totalOrders, icon: Package, description: "Tüm seferler",
      gradient: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/30",
      iconColor: "text-blue-500 dark:text-blue-400", valueColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Aktif Sefer", value: stats.activeOrders, icon: TrendingUp, description: "Devam eden",
      gradient: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/30",
      iconColor: "text-emerald-500 dark:text-emerald-400", valueColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Araç", value: stats.totalVehicles, icon: Truck, description: "Kayıtlı araçlar",
      gradient: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/30",
      iconColor: "text-violet-500 dark:text-violet-400", valueColor: "text-violet-600 dark:text-violet-400",
    },
    {
      title: "Sürücü", value: stats.totalDrivers, icon: Users, description: "Kayıtlı sürücüler",
      gradient: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/30",
      iconColor: "text-amber-500 dark:text-amber-400", valueColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Bildirim", value: stats.pendingNotifications, icon: Bell, description: "Okunmamış",
      gradient: "from-rose-500/20 to-pink-500/20", border: "border-rose-500/30",
      iconColor: "text-rose-500 dark:text-rose-400", valueColor: "text-rose-600 dark:text-rose-400",
    },
  ];

  const maxMonthly = Math.max(...stats.monthlyCounts.map(m => m.count), 1);

  return (
    <div className="space-y-6 page-enter">
      {/* Filtre satırı */}
      <div className="surface-panel flex flex-wrap gap-2 items-center rounded-2xl px-3 py-2.5 md:px-4">
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Yıl</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={handleRefresh} title="Yenile">
          <RefreshCw className="h-4 w-4" />
        </Button>

        <span className="text-sm text-muted-foreground ml-1">{periodLabel} verileri</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map(card => (
          <Card key={card.title} className={`border ${card.border} hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${card.gradient} border border-border`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</div>
              <p className="text-xs text-muted-foreground/60 mt-1">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {liveOps ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Canli Operasyon Ozeti</CardTitle>
            <Link href="/live-operations" className="text-xs text-primary underline">Detay</Link>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Aktif Is</p>
              <p className="text-xl font-semibold">{liveOps.activeOrders}</p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Aktif Surucu</p>
              <p className="text-xl font-semibold">{liveOps.activeDrivers}</p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Issue (24s)</p>
              <p className="text-xl font-semibold">{liveOps.unresolvedIssues}</p>
            </div>
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Son Event</p>
              <p className="text-xl font-semibold">{liveOps.recentEventCount}</p>
            </div>
          </CardContent>
          <CardContent className="pt-0">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              <p className="text-muted-foreground">Eksik Fotograf</p>
              <p className="text-lg font-semibold">{liveOps.missingPhotoOrders}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Aylık sefer grafiği */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <BarChart2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          <CardTitle className="text-sm font-medium text-muted-foreground">{selectedYear} — Aylık Sefer Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1.5 h-24">
            {stats.monthlyCounts.map((m) => {
              const heightPct = Math.round((m.count / maxMonthly) * 100);
              const isCurrentMonth = m.month === new Date().getMonth() + 1 && selectedYear === String(CURRENT_YEAR);
              return (
                <div key={m.month} className="flex flex-col items-center flex-1 gap-1">
                  <span className="text-[10px] text-muted-foreground">{m.count > 0 ? m.count : ""}</span>
                  <div
                    className={`w-full rounded-sm transition-all ${isCurrentMonth ? "bg-blue-500 dark:bg-blue-400" : "bg-blue-300/50 dark:bg-blue-700/50"}`}
                    style={{ height: `${Math.max(heightPct, m.count > 0 ? 8 : 2)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground/60">{MONTHS[m.month - 1].slice(0, 3)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {stats.recentFuelRecords.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Fuel className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Son Yakıt Kayıtları</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentFuelRecords.map(r => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{r.vehicle?.plateNumber ?? "-"}</span>
                  <span className="text-muted-foreground">{(r.liters ?? 0).toFixed(1)} L</span>
                  <span className="text-muted-foreground">{new Date(r.date).toLocaleDateString("tr-TR")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
