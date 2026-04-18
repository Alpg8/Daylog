"use client";

import { useState, useEffect, useCallback } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type FilterConfig } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { VehicleStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExcelExport } from "@/components/shared/excel-export";
import { ExcelImportDialog } from "@/components/shared/excel-import-dialog";
import { AttachmentManager } from "@/components/shared/attachment-manager";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { VEHICLE_ATTACHMENT_LABEL_OPTIONS } from "@/lib/document-presets";
import type { Vehicle } from "@/types";

const LIVE_UPDATE_EVENT = "daylog:live-update";

export function VehicleTable() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vehicles", { cache: "no-store" });
      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok || !contentType.includes("application/json")) {
        throw new Error("Arac verisi alinamadi");
      }

      const data = (await res.json()) as { vehicles?: Vehicle[] };
      setVehicles(data.vehicles ?? []);
    } catch {
      setVehicles([]);
      toast.error("Araclar yuklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  useEffect(() => {
    const handleLiveUpdate = () => {
      void fetchVehicles();
    };

    window.addEventListener(LIVE_UPDATE_EVENT, handleLiveUpdate);
    return () => window.removeEventListener(LIVE_UPDATE_EVENT, handleLiveUpdate);
  }, [fetchVehicles]);

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/vehicles/${deletingId}`, { method: "DELETE" });
      if (res.ok) { toast.success("Araç silindi"); fetchVehicles(); }
      else toast.error("Silme başarısız");
    } finally { setDeleteLoading(false); setDeletingId(null); }
  };

  const vehicleFilters: FilterConfig[] = [
    {
      label: "Durum",
      column: "status",
      options: [
        { label: "Müsait", value: "AVAILABLE" },
        { label: "Yolda", value: "ON_ROUTE" },
        { label: "Bakımda", value: "MAINTENANCE" },
        { label: "Pasif", value: "PASSIVE" },
      ],
    },
    {
      label: "Kullanım",
      column: "usageType",
      options: [
        { label: "Yurtiçi", value: "YURTICI" },
        { label: "Yurtdışı", value: "YURTDISI" },
      ],
    },
    {
      label: "Mülkiyet",
      column: "ownershipType",
      options: [
        { label: "Öz Mal", value: "OZMAL" },
        { label: "Kiralık", value: "KIRALIK" },
      ],
    },
  ];

  const columns: ColumnDef<Vehicle>[] = [
    { accessorKey: "plateNumber", header: "Plaka", meta: { editable: true } },
    { accessorKey: "brand", header: "Marka", meta: { editable: true }, cell: ({ row }) => row.original.brand ?? "—" },
    { accessorKey: "model", header: "Model", meta: { editable: true }, cell: ({ row }) => row.original.model ?? "—" },
    { accessorKey: "usageType", header: "Kullanım", filterFn: "equals", cell: ({ row }) => row.original.usageType ?? "—" },
    { accessorKey: "ownershipType", header: "Mülkiyet", filterFn: "equals", cell: ({ row }) => row.original.ownershipType ?? "—" },
    { accessorKey: "status", header: "Durum", filterFn: "equals", cell: ({ row }) => <VehicleStatusBadge status={row.original.status} /> },
    {
      accessorKey: "latestKm",
      header: "Son KM",
      cell: ({ row }) => {
        const km = (row.original as Vehicle & { latestKm?: number | null }).latestKm;
        return km != null ? <span className="font-mono text-sm">{km.toLocaleString("tr-TR")} km</span> : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "actions", header: "", cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditing(row.original); setFormOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Düzenle</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/vehicles/${row.original.id}`}>Arac Detay</Link>
            </DropdownMenuItem>
            <div className="px-2 py-1.5">
              <AttachmentManager
                title={`${row.original.plateNumber} Dosyalari`}
                description="Muayene, kasko, sigorta ve diger arac evraklarini yonetin."
                entityId={row.original.id}
                endpointBase="/api/vehicles"
                triggerClassName="h-auto w-full justify-start gap-2 rounded-sm border-0 bg-transparent px-0 py-0 text-sm font-normal shadow-none hover:bg-transparent"
                labelOptions={VEHICLE_ATTACHMENT_LABEL_OPTIONS}
              />
            </div>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeletingId(row.original.id)}><Trash2 className="mr-2 h-4 w-4" />Sil</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  ];

  const exportCols = [
    { key: "plateNumber", header: "Plaka" }, { key: "brand", header: "Marka" },
    { key: "model", header: "Model" }, { key: "usageType", header: "Kullanım" },
    { key: "ownershipType", header: "Mülkiyet" }, { key: "status", header: "Durum" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Araçlar (Çekici)" description={`${vehicles.length} araç`}
        onAdd={() => { setEditing(null); setFormOpen(true); }}
        actions={
          <div className="flex items-center gap-2">
            <ExcelImportDialog
              title="Araçları Excel'den İçe Aktar"
              endpoint="/api/vehicles"
              onSuccess={fetchVehicles}
              templateFileName="arac-sablonu"
              templateRow={{
                "Plaka": "34 XX 0000",
                "Marka": "Mercedes",
                "Model": "Actros 1851",
                "Kapasite": "24000 kg",
                "Kullanım Tipi": "YURTDISI",
                "Mülkiyet": "OZMAL",
                "Durum": "AVAILABLE",
                "Muayene SKT": "2026-11-15",
                "Notlar": "",
              }}
              columns={[
                { headers: ["Plaka", "plaka", "plate", "platenumber"], key: "plateNumber", label: "Plaka", required: true },
                { headers: ["Marka", "brand"], key: "brand", label: "Marka" },
                { headers: ["Model", "model"], key: "model", label: "Model" },
                { headers: ["Kapasite", "capacity"], key: "capacity", label: "Kapasite" },
                { headers: ["Kullanım Tipi", "kullanim", "usagetype"], key: "usageType", label: "Kullanım" },
                { headers: ["Mülkiyet", "mulkiyet", "ownershiptype"], key: "ownershipType", label: "Mülkiyet" },
                { headers: ["Durum", "status"], key: "status", label: "Durum" },
                { headers: ["Muayene SKT", "muayeneskt", "maintenanceexpiry"], key: "maintenanceExpiry", label: "Muayene SKT", transform: (v) => { const r = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); return r ? `${r[3]}-${r[2].padStart(2,"0")}-${r[1].padStart(2,"0")}` : (v || null); } },
                { headers: ["Notlar", "not", "notes"], key: "notes", label: "Notlar" },
              ]}
            />
            <ExcelExport data={vehicles as unknown as Record<string, unknown>[]} columns={exportCols} fileName="araclar" />
          </div>
        }
      />
      <DataTable columns={columns} data={vehicles} loading={loading} searchPlaceholder="Plaka, marka ara..." filters={vehicleFilters} onCellEdit={async (rowIndex, columnId, value) => {
        const v = vehicles[rowIndex];
        if (!v) return;
        const res = await fetch(`/api/vehicles/${v.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [columnId]: value }) });
        if (res.ok) { toast.success("Kaydedildi"); fetchVehicles(); } else { toast.error("Kaydedilemedi"); }
      }} />
      <VehicleForm open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }} onSuccess={fetchVehicles} initialData={editing} />
      <ConfirmDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)} onConfirm={handleDelete} loading={deleteLoading} title="Aracı sil" description="Bu araç kalıcı olarak silinecektir." />
    </div>
  );
}
