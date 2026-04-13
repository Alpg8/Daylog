"use client";

import { useCallback, useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type FilterConfig } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExcelExport } from "@/components/shared/excel-export";
import { FuelForm } from "./fuel-form";
import { EntityPopover } from "@/components/shared/entity-popover";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { FuelRecord } from "@/types";

const fmtDate = (d: Date | string | null | undefined) => d ? new Date(d).toLocaleDateString("tr-TR") : "-";

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
    <div className="space-y-4">
      <PageHeader title="Yakıt Kayıtları" onAdd={() => { setEditing(null); setFormOpen(true); }}
        actions={<ExcelExport data={exportData} fileName="yakit-kayitlari" label="Excel İndir" />}
      />
      {loading ? <p className="text-white/40">Yükleniyor...</p> : <DataTable columns={columns} data={data} searchPlaceholder="İstasyon ara..." filters={fuelFilters} />}
      <FuelForm open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchData} initialData={editing} />
      <ConfirmDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)} onConfirm={handleDelete} description="Bu yakıt kaydını silmek istediğinize emin misiniz?" />
    </div>
  );
}
