"use client";

import { useCallback, useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Clock, Droplets, MoreHorizontal, Pencil, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type FilterConfig } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExcelExport } from "@/components/shared/excel-export";
import { FuelForm } from "./fuel-form";
import { EntityPopover } from "@/components/shared/entity-popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FuelRecord } from "@/types";

const LIVE_UPDATE_EVENT = "daylog:live-update";

const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("tr-TR") : "-";
const fmtDateTime = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleString("tr-TR") : "-";

interface FuelRequestRow {
  id: string;
  km: number;
  tankLeft: number;
  tankRight: number;
  requestedLiters: number | null;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewedAt: string | null;
  driver: { fullName: string; phoneNumber: string | null } | null;
  vehicle: { plateNumber: string } | null;
}

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tümü" },
  { value: "PENDING", label: "Onay Bekliyor" },
  { value: "APPROVED", label: "Onaylandı" },
  { value: "REJECTED", label: "Reddedildi" },
];

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "warning" | "success" | "destructive" }> = {
  PENDING: { label: "Onay Bekliyor", variant: "warning" },
  APPROVED: { label: "Onaylandı", variant: "success" },
  REJECTED: { label: "Reddedildi", variant: "destructive" },
};

function FuelRequestList({ onReviewed }: { onReviewed: () => void }) {
  const [requests, setRequests] = useState<FuelRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusFilter>("ALL");
  const [note, setNote] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/fuel-requests?status=all");
    if (res.ok) {
      const j = await res.json() as { requests: FuelRequestRow[] };
      setRequests(j.requests ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    const handler = () => { void fetchRequests(); };
    window.addEventListener(LIVE_UPDATE_EVENT, handler);
    return () => window.removeEventListener(LIVE_UPDATE_EVENT, handler);
  }, [fetchRequests]);

  async function review(id: string, action: "approve" | "reject") {
    setReviewing(id);
    const res = await fetch(`/api/fuel-requests/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note: note[id] }),
    });
    if (res.ok) {
      toast.success(action === "approve" ? "Talep onaylandı" : "Talep reddedildi");
      void fetchRequests();
      onReviewed();
    } else {
      toast.error("İşlem başarısız");
    }
    setReviewing(null);
  }

  const filtered = activeTab === "ALL" ? requests : requests.filter(r => r.status === activeTab);
  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-400" />
          Yakıt Talepleri
          {pendingCount > 0 && (
            <Badge variant="warning" className="text-xs">{pendingCount} bekliyor</Badge>
          )}
        </h3>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
        {STATUS_TABS.map(tab => {
          const count = tab.value === "ALL"
            ? requests.length
            : requests.filter(r => r.status === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/10"
              }`}
            >
              {tab.label}
              {count > 0 && <span className="ml-1.5 text-white/40">({count})</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-white/40 text-sm py-4">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-white/30 gap-2">
          <Droplets className="h-8 w-8" />
          <p className="text-sm">Bu kategoride talep yok</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((req) => {
            const badge = STATUS_BADGE[req.status] ?? { label: req.status, variant: "default" as const };
            const isPending = req.status === "PENDING";
            return (
              <Card key={req.id} className={isPending ? "border-amber-500/30 bg-amber-500/5" : ""}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span className="font-medium text-sm">{req.driver?.fullName ?? "—"}</span>
                        <span className="text-white/40">·</span>
                        <span className="text-white/60 text-sm">{req.vehicle?.plateNumber ?? "—"}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/70 mt-1">
                        <span>KM: <span className="text-white">{req.km}</span></span>
                        <span>Sol: <span className="text-white">{req.tankLeft} L</span></span>
                        <span>Sağ: <span className="text-white">{req.tankRight} L</span></span>
                        {req.requestedLiters != null && (
                          <span>Talep: <span className="text-amber-300 font-medium">{req.requestedLiters} L</span></span>
                        )}
                      </div>
                      {req.notes && (
                        <p className="text-xs text-white/40 italic mt-1">{req.notes}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-white/30 mt-1">
                        <Clock className="h-3 w-3" />
                        {fmtDateTime(req.createdAt)}
                        {req.reviewedAt && (
                          <span className="ml-2">· Yanıtlandı: {fmtDateTime(req.reviewedAt)}</span>
                        )}
                      </div>
                    </div>

                    {/* Right: actions — only for pending */}
                    {isPending && (
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          className="w-32 rounded bg-white/10 border border-white/20 px-2 py-1 text-xs text-white placeholder:text-white/30 outline-none focus:border-white/40"
                          placeholder="Not (opsiyonel)"
                          value={note[req.id] ?? ""}
                          onChange={(e) => setNote((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={reviewing === req.id}
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          onClick={() => void review(req.id, "approve")}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={reviewing === req.id}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => void review(req.id, "reject")}
                        >
                          <XCircle className="h-4 w-4 mr-1" />Reddet
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FuelTable() {
  const [data, setData] = useState<FuelRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FuelRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/fuel");
    if (res.ok) { const j = await res.json(); setData(j.records ?? j); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handleLiveUpdate = () => {
      void fetchData();
    };

    window.addEventListener(LIVE_UPDATE_EVENT, handleLiveUpdate);
    return () => window.removeEventListener(LIVE_UPDATE_EVENT, handleLiveUpdate);
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await fetch(`/api/fuel/${deletingId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Yakıt kaydı silindi"); fetchData(); } else { toast.error("Silinemedi"); }
    setDeletingId(null);
  };

  const fuelFilters: FilterConfig[] = [
    {
      label: "Yakıt Türü",
      column: "fuelType",
      options: [
        { label: "Motorin", value: "MOTORIN" },
        { label: "Benzin", value: "BENZIN" },
        { label: "AdBlue", value: "ADBLUE" },
      ],
    },
    {
      label: "Ödeme",
      column: "paymentMethod",
      options: [
        { label: "Nakit", value: "NAKIT" },
        { label: "Kart", value: "KART" },
        { label: "Akaryakıt Kartı", value: "AKARYAKIT_KARTI" },
      ],
    },
  ];

  type FuelRecordFull = typeof data[number] & {
    vehicle?: { plateNumber: string; brand?: string | null; model?: string | null; status: string };
    driver?: { fullName: string; phoneNumber?: string | null; usageType?: string | null } | null;
  };

  const columns: ColumnDef<FuelRecord>[] = [
    { accessorKey: "date", header: "Tarih", cell: ({ row }) => fmtDate(row.getValue("date")) },
    {
      id: "vehiclePlate", header: "Araç",
      cell: ({ row }) => {
        const v = (row.original as FuelRecordFull).vehicle;
        if (!v) return <span className="text-muted-foreground/40">—</span>;
        return (
          <EntityPopover
            trigger={v.plateNumber}
            title={v.plateNumber}
            items={[
              { label: "Marka", value: v.brand ?? "—" },
              { label: "Model", value: v.model ?? "—" },
              { label: "Durum", value: v.status },
            ]}
          />
        );
      },
    },
    {
      id: "driverName", header: "Sürücü",
      cell: ({ row }) => {
        const d = (row.original as FuelRecordFull).driver;
        if (!d) return <span className="text-muted-foreground/40">—</span>;
        return (
          <EntityPopover
            trigger={d.fullName}
            title={d.fullName}
            items={[
              { label: "Telefon", value: d.phoneNumber ?? "—" },
              { label: "Kullanım", value: d.usageType ?? "—" },
            ]}
          />
        );
      },
    },
    { accessorKey: "liters", header: "Litre", cell: ({ row }) => `${(row.getValue("liters") as number).toFixed(1)} L` },
    { accessorKey: "fuelType", header: "Yakıt Türü", filterFn: "equals", cell: ({ row }) => row.getValue("fuelType") || "—" },
    { accessorKey: "fuelStation", header: "İstasyon", cell: ({ row }) => row.getValue("fuelStation") || "—" },
    { accessorKey: "totalCost", header: "Toplam", cell: ({ row }) => row.getValue("totalCost") ? `${(row.getValue("totalCost") as number).toFixed(2)}` : "—" },
    { accessorKey: "distanceKm", header: "KM", cell: ({ row }) => row.getValue("distanceKm") ? `${row.getValue("distanceKm")} km` : "—" },
    { accessorKey: "country", header: "Ülke", cell: ({ row }) => row.getValue("country") || "—" },
    { accessorKey: "paymentMethod", header: "Ödeme", filterFn: "equals", cell: ({ row }) => row.getValue("paymentMethod") || "—" },
    {
      id: "actions", header: "", cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditing(row.original); setFormOpen(true); }}><Pencil className="h-4 w-4 mr-2" />Düzenle</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeletingId(row.original.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Sil</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const exportData = data.map(f => ({
    Tarih: fmtDate(f.date),
    Litre: f.liters,
    "Birim Fiyat": f.pricePerLiter ?? "",
    "Toplam Maliyet": f.totalCost ?? "",
    İstasyon: f.fuelStation ?? "",
    "Başlangıç KM": f.startKm ?? "",
    "Bitiş KM": f.endKm ?? "",
    "Mesafe KM": f.distanceKm ?? "",
    "Yakıt Türü": f.fuelType ?? "",
    Ödeme: f.paymentMethod ?? "",
    Ülke: f.country ?? "",
    Şehir: f.city ?? "",
    "Para Birimi": f.currency ?? "",
  }));

  return (
    <div className="space-y-6">
      <FuelRequestList onReviewed={fetchData} />
      <div className="border-t border-white/10 pt-4" />
      <PageHeader title="Yakıt Kayıtları" onAdd={() => { setEditing(null); setFormOpen(true); }}
        actions={<ExcelExport data={exportData} fileName="yakit-kayitlari" label="Excel İndir" />}
      />
      {loading ? <p className="text-white/40">Yükleniyor...</p> : <DataTable columns={columns} data={data} searchPlaceholder="İstasyon ara..." filters={fuelFilters} />}
      <FuelForm open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchData} initialData={editing} />
      <ConfirmDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)} onConfirm={handleDelete} description="Bu yakıt kaydını silmek istediğinize emin misiniz?" />
    </div>
  );
}
