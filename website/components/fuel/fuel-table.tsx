"use client";

import { useCallback, useEffect, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Clock, Droplets, Pencil, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FuelForm } from "@/components/fuel/fuel-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FuelRecordWithRelations } from "@/types";

const LIVE_UPDATE_EVENT = "daylog:live-update";

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
      <div className="flex gap-1 bg-black/5 rounded-lg p-1 w-fit">
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
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5"
              }`}
            >
              {tab.label}
              {count > 0 && <span className="ml-1.5 text-muted-foreground/60">({count})</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm py-4">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50 gap-2">
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
                        <span className="text-muted-foreground">·</span>
                        <span className="text-muted-foreground text-sm">{req.vehicle?.plateNumber ?? "—"}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                        <span>KM: <span className="text-foreground font-medium">{req.km}</span></span>
                        <span>Sol: <span className="text-foreground font-medium">{req.tankLeft} cm</span></span>
                        <span>Sağ: <span className="text-foreground font-medium">{req.tankRight} cm</span></span>
                        {req.requestedLiters != null && (
                          <span>Talep: <span className="text-amber-300 font-medium">{req.requestedLiters} L</span></span>
                        )}
                      </div>
                      {req.notes && (
                        <p className="text-xs text-muted-foreground/70 italic mt-1">{req.notes}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground/60 mt-1">
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
                          className="w-32 rounded bg-background border border-border px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
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
  const [records, setRecords] = useState<FuelRecordWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FuelRecordWithRelations | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fuel");
      if (res.ok) {
        const j = await res.json() as { records: FuelRecordWithRelations[] };
        setRecords(j.records ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRecords(); }, [fetchRecords]);

  useEffect(() => {
    const handler = () => { void fetchRecords(); };
    window.addEventListener(LIVE_UPDATE_EVENT, handler);
    return () => window.removeEventListener(LIVE_UPDATE_EVENT, handler);
  }, [fetchRecords]);

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/fuel/${deletingId}`, { method: "DELETE" });
      if (res.ok) { toast.success("Kayıt silindi"); void fetchRecords(); }
      else toast.error("Silme başarısız");
    } finally { setDeleteLoading(false); setDeletingId(null); }
  };

  const fmtDate = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("tr-TR") : "—";
  const fmtNum = (v: unknown, suffix = "") =>
    v != null && v !== "" ? `${v}${suffix}` : "—";

  const columns: ColumnDef<FuelRecordWithRelations>[] = [
    { accessorKey: "date", header: "Tarih", cell: ({ row }) => fmtDate(row.original.date) },
    { id: "vehicle", header: "Araç", cell: ({ row }) => row.original.vehicle?.plateNumber ?? "—" },
    { id: "driver", header: "Sürücü", cell: ({ row }) => row.original.driver?.fullName ?? "—" },
    { accessorKey: "liters", header: "Litre", cell: ({ row }) => fmtNum(row.original.liters, " L") },
    { accessorKey: "pricePerLiter", header: "Lt Fiyatı", cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).pricePerLiter) },
    { accessorKey: "totalCost", header: "Toplam", cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).totalCost) },
    { accessorKey: "currency", header: "Para Birimi", cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).currency) },
    { accessorKey: "fuelType", header: "Yakıt Tipi", cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).fuelType) },
    { accessorKey: "fuelStation", header: "İstasyon", cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).fuelStation) },
    { accessorKey: "country", header: "Ülke", cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).country) },
    { accessorKey: "paymentMethod", header: "Ödeme", cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).paymentMethod) },
    { accessorKey: "startKm", header: "Başlangıç KM", cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).startKm) },
    { accessorKey: "endKm", header: "Bitiş KM", cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).endKm) },
    { accessorKey: "distanceKm", header: "Mesafe", cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).distanceKm, " km") },
    { accessorKey: "notes", header: "Not", cell: ({ row }) => fmtNum(row.original.notes) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yakıt Kayıtları"
        description={`${records.length} kayıt`}
        onAdd={() => { setEditing(null); setFormOpen(true); }}
      />

      <DataTable
        columns={columns}
        data={records}
        loading={loading}
        searchPlaceholder="Araç, sürücü, istasyon ara..."
        rowActions={(row) => (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { setEditing(row); setFormOpen(true); }}
            >
              <Pencil className="h-3.5 w-3.5" />
              Düzenle
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setDeletingId(row.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Sil
            </Button>
          </div>
        )}
      />

      <FuelForm
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        onSuccess={() => { void fetchRecords(); }}
        initialData={editing}
      />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Kaydı sil"
        description="Bu yakıt kaydı kalıcı olarak silinecektir."
      />

      <FuelRequestList onReviewed={() => { void fetchRecords(); }} />
    </div>
  );
}
