"use client";

import { useCallback, useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type FilterConfig } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExcelExport } from "@/components/shared/excel-export";
import { AttachmentManager } from "@/components/shared/attachment-manager";
import { DriverForm } from "./driver-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DRIVER_ATTACHMENT_LABEL_OPTIONS } from "@/lib/document-presets";
import type { Driver } from "@/types";

const LIVE_UPDATE_EVENT = "daylog:live-update";

type DriverRow = Driver & {
  assignedVehicle?: {
    id: string;
    plateNumber: string;
    brand?: string | null;
    model?: string | null;
    modelYear?: number | null;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  } | null;
};

const fmtDate = (d: Date | string | null | undefined) => d ? new Date(d).toLocaleDateString("tr-TR") : "-";

export function DriverTable() {
  const [data, setData] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drivers", { cache: "no-store" });
      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok || !contentType.includes("application/json")) {
        throw new Error("Surucu verisi alinamadi");
      }

      const j = (await res.json()) as { drivers?: DriverRow[] };
      setData(j.drivers ?? []);
    } catch {
      setData([]);
      toast.error("Suruculer yuklenemedi");
    } finally {
      setLoading(false);
    }
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
    const res = await fetch(`/api/drivers/${deletingId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Sürücü silindi"); fetchData(); } else { toast.error("Silinemedi"); }
    setDeletingId(null);
  };

  const driverFilters: FilterConfig[] = [
    {
      label: "Durum",
      column: "isActive",
      options: [
        { label: "Aktif", value: "true" },
        { label: "Pasif", value: "false" },
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
  ];

  const columns: ColumnDef<DriverRow>[] = [
    { accessorKey: "fullName", header: "Ad Soyad", meta: { editable: true } },
    { accessorKey: "phoneNumber", header: "Telefon", meta: { editable: true }, cell: ({ row }) => row.getValue("phoneNumber") || "—" },
    { accessorKey: "nationalId", header: "TC Kimlik", cell: ({ row }) => row.getValue("nationalId") || "—" },
    {
      id: "vehicle",
      header: "Bagli Arac",
      accessorFn: (row) => row.assignedVehicle?.plateNumber ?? "",
      cell: ({ row }) => {
        const vehicle = row.original.assignedVehicle;
        if (!vehicle) return "—";
        const vehicleLabel = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
        return vehicleLabel ? `${vehicle.plateNumber} (${vehicleLabel})` : vehicle.plateNumber;
      },
    },
    { accessorKey: "usageType", header: "Kullanım", filterFn: "equals", cell: ({ row }) => row.getValue("usageType") || "—" },
    { accessorKey: "ownershipType", header: "Mulkiyet", cell: ({ row }) => row.getValue("ownershipType") || "—" },
    {
      accessorKey: "isActive", header: "Durum", filterFn: (row, id, value) => String(row.getValue(id)) === String(value),
      cell: ({ row }) => <Badge variant={row.getValue("isActive") ? "success" : "secondary"}>{row.getValue("isActive") ? "Aktif" : "Pasif"}</Badge>,
    },
    {
      id: "actions", header: "", cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditing(row.original); setFormOpen(true); }}><Pencil className="h-4 w-4 mr-2" />Düzenle</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/drivers/${row.original.id}`}>Surucu Detay</Link>
            </DropdownMenuItem>
            <div className="px-2 py-1.5">
              <AttachmentManager
                title={`${row.original.fullName} Dosyalari`}
                description="Surucuye ait ehliyet, pasaport ve diger belgeleri yonetin."
                entityId={row.original.id}
                endpointBase="/api/drivers"
                triggerClassName="h-auto w-full justify-start gap-2 rounded-sm border-0 bg-transparent px-0 py-0 text-sm font-normal shadow-none hover:bg-transparent"
                labelOptions={DRIVER_ATTACHMENT_LABEL_OPTIONS}
              />
            </div>
            <DropdownMenuItem onClick={() => setDeletingId(row.original.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Sil</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const exportData = data.map(d => ({
    "Ad Soyad": d.fullName,
    Telefon: d.phoneNumber ?? "",
    "TC Kimlik": d.nationalId ?? "",
    "Bagli Arac": d.assignedVehicle?.plateNumber ?? "",
    "Arac Detayi": [d.assignedVehicle?.brand, d.assignedVehicle?.model].filter(Boolean).join(" "),
    "Kullanım Türü": d.usageType ?? "",
    "Mülkiyet": d.ownershipType ?? "",
    Durum: d.isActive ? "Aktif" : "Pasif",
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="Sürücüler" onAdd={() => { setEditing(null); setFormOpen(true); }}
        actions={<ExcelExport data={exportData} fileName="suruculer" label="Excel İndir" />}
      />
      {loading ? <p className="text-muted-foreground/60">Yükleniyor...</p> : <DataTable columns={columns} data={data} searchPlaceholder="Isim, telefon veya arac ara..." filters={driverFilters} onCellEdit={async (rowIndex, columnId, value) => {
        const d = data[rowIndex];
        if (!d) return;
        const res = await fetch(`/api/drivers/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [columnId]: value }) });
        if (res.ok) { toast.success("Kaydedildi"); fetchData(); } else { toast.error("Kaydedilemedi"); }
      }} />}
      <DriverForm open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchData} initialData={editing} />
      <ConfirmDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)} onConfirm={handleDelete} description="Bu sürücüyü silmek istediğinize emin misiniz?" />
    </div>
  );
}
