"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ClipboardList,
  ImageOff,
  RefreshCw,
  Truck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  PENDING: "bg-slate-500/10 text-slate-700 border-slate-500/30",
};

interface LiveSummary {
  cards: {
    activeOrders: number;
    activeDrivers: number;
    unresolvedIssues: number;
    recentEventCount: number;
    missingPhotoOrders: number;
    missingConfirmationOrders: number;
    missingCloseoutOrders: number;
    openTaskCount: number;
  };
  tracking: Array<{
    orderId: string;
    orderStatus: string;
    cargoNumber: string | null;
    tripNumber: string | null;
    driver: { id: string; fullName: string } | null;
    lastActionType: string | null;
    lastActionAt: string | null;
    hasPhotoOnLastAction: boolean;
    warnings: Array<{ code: string; message: string }>;
    warningCount: number;
  }>;
}

export default function LiveOperationsPage() {
  const [data, setData] = useState<LiveSummary | null>(null);
  const [driverFilter, setDriverFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("driverId", driverFilter);
    params.set("orderStatus", statusFilter);
    const res = await fetch(`/api/live-operations/summary?${params.toString()}`);
    if (res.ok) {
      setData((await res.json()) as LiveSummary);
    }
  }, [driverFilter, statusFilter]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 12000);
    return () => clearInterval(timer);
  }, [fetchData]);

  if (!data) return <p className="text-sm text-muted-foreground">Yukleniyor...</p>;

  const driverOptions = Array.from(
    new Map(
      data.tracking
        .filter((row) => row.driver)
        .map((row) => [row.driver!.id, row.driver!.fullName])
    ).entries()
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="grid flex-1 gap-3 md:grid-cols-2">
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger><SelectValue placeholder="Surucu filtresi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tum suruculer</SelectItem>
                {driverOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Durum filtresi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Planli + Devam Eden</SelectItem>
                <SelectItem value="PENDING">Beklemede</SelectItem>
                <SelectItem value="PLANNED">Planli</SelectItem>
                <SelectItem value="IN_PROGRESS">Devam Ediyor</SelectItem>
                <SelectItem value="COMPLETED">Tamamlandi</SelectItem>
                <SelectItem value="CANCELLED">Iptal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </CardContent>
      </Card>

      {/* Top stat row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Truck className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{data.cards.activeOrders}</p><p className="text-xs text-muted-foreground">Aktif Is</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{data.cards.activeDrivers}</p><p className="text-xs text-muted-foreground">Aktif Surucu</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${data.cards.unresolvedIssues > 0 ? "bg-red-500/10" : "bg-muted"}`}><AlertTriangle className={`h-5 w-5 ${data.cards.unresolvedIssues > 0 ? "text-red-600" : "text-muted-foreground"}`} /></div>
            <div><p className={`text-2xl font-bold ${data.cards.unresolvedIssues > 0 ? "text-red-600" : ""}`}>{data.cards.unresolvedIssues}</p><p className="text-xs text-muted-foreground">Sorun (24s)</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted"><ClipboardList className="h-5 w-5 text-muted-foreground" /></div>
            <div><p className="text-2xl font-bold">{data.cards.recentEventCount}</p><p className="text-xs text-muted-foreground">Son Event</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Eksik/Acik row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className={data.cards.missingPhotoOrders > 0 ? "border-amber-500/30" : ""}>
          <CardContent className="flex items-center gap-3 p-4">
            <ImageOff className={`h-5 w-5 ${data.cards.missingPhotoOrders > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
            <div><p className="text-2xl font-bold">{data.cards.missingPhotoOrders}</p><p className="text-xs text-muted-foreground">Eksik Fotograf</p></div>
          </CardContent>
        </Card>
        <Card className={data.cards.missingConfirmationOrders > 0 ? "border-amber-500/30" : ""}>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className={`h-5 w-5 ${data.cards.missingConfirmationOrders > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
            <div><p className="text-2xl font-bold">{data.cards.missingConfirmationOrders}</p><p className="text-xs text-muted-foreground">Eksik Onam</p></div>
          </CardContent>
        </Card>
        <Card className={data.cards.missingCloseoutOrders > 0 ? "border-amber-500/30" : ""}>
          <CardContent className="flex items-center gap-3 p-4">
            <Camera className={`h-5 w-5 ${data.cards.missingCloseoutOrders > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
            <div><p className="text-2xl font-bold">{data.cards.missingCloseoutOrders}</p><p className="text-xs text-muted-foreground">Eksik Kapanis</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-2xl font-bold">{data.cards.openTaskCount}</p><p className="text-xs text-muted-foreground">Acik Gorev</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Tracking grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" /> Surucu Takip ({data.tracking.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.tracking.length === 0 && <p className="text-sm text-muted-foreground">Eslesen kayit yok.</p>}
          {data.tracking.map((row) => (
            <div key={row.orderId} className={`rounded-lg border p-3 text-sm ${row.warningCount > 0 ? "border-amber-500/20" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={STATUS_COLORS[row.orderStatus] ?? ""}>
                    {STATUS_LABELS[row.orderStatus] ?? row.orderStatus}
                  </Badge>
                  <span className="font-medium">{row.cargoNumber || "Yuk No Yok"}</span>
                  {row.tripNumber && <span className="text-xs text-muted-foreground">/ {row.tripNumber}</span>}
                </div>
                <Link href={`/orders/${row.orderId}`} className="text-xs text-primary underline">Detay</Link>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <p className="text-muted-foreground">
                  Surucu: {row.driver ? <Link href={`/drivers/${row.driver.id}`} className="text-primary underline">{row.driver.fullName}</Link> : "-"}
                </p>
                <p className="text-muted-foreground">
                  Son aksiyon: {row.lastActionType ? (EVENT_LABELS[row.lastActionType] ?? row.lastActionType) : "-"}
                </p>
                <p className="text-muted-foreground">
                  Guncelleme: {row.lastActionAt ? new Date(row.lastActionAt).toLocaleString("tr-TR") : "-"}
                </p>
                <p className="text-muted-foreground flex items-center gap-1">
                  Foto: {row.hasPhotoOnLastAction ? <Camera className="h-3 w-3 text-emerald-600" /> : <ImageOff className="h-3 w-3 text-muted-foreground" />}
                  {row.hasPhotoOnLastAction ? "Var" : "Yok"}
                </p>
              </div>
              {row.warningCount > 0 && (
                <div className="mt-2 space-y-1 rounded border border-amber-500/30 bg-amber-500/5 p-2">
                  {row.warnings.slice(0, 2).map((warning, idx) => (
                    <p key={`${warning.code}-${idx}`} className="text-xs text-amber-700 dark:text-amber-300">
                      <Badge variant="outline" className="mr-1 text-[10px] px-1 py-0">{warning.code.replace("MISSING_", "")}</Badge>
                      {warning.message}
                    </p>
                  ))}
                  {row.warningCount > 2 && <p className="text-xs text-muted-foreground">+{row.warningCount - 2} ek uyari</p>}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
