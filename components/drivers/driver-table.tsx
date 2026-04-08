"use client";

import { useCallback, useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type FilterConfig } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExcelExport } from "@/components/shared/excel-export";
import { DriverForm } from "./driver-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Driver } from "@/types";

const fmtDate = (d: Date | string | null | undefined) => d ? new Date(d).toLocaleDateString("tr-TR") : "-";

export function DriverTable() {
  const [data, setData] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/drivers");
    if (res.ok) { const j = await res.json(); setData(j.drivers ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const columns: ColumnDef<Driver>[] = [
    { accessorKey: "fullName", header: "Ad Soyad" },
    { accessorKey: "phoneNumber", header: "Telefon", cell: ({ row }) => row.getValue("phoneNumber") || "—" },
    { accessorKey: "licenseExpiryDate", header: "Ehliyet Bitiş", cell: ({ row }) => fmtDate(row.getValue("licenseExpiryDate")) },
    { accessorKey: "passportExpiryDate", header: "Pasaport Bitiş", cell: ({ row }) => fmtDate(row.getValue("passportExpiryDate")) },
    { accessorKey: "psychotechnicExpiryDate", header: "Psikoteknik Bitiş", cell: ({ row }) => fmtDate(row.getValue("psychotechnicExpiryDate")) },
    { accessorKey: "usageType", header: "Kullanım", filterFn: "equals", cell: ({ row }) => row.getValue("usageType") || "—" },
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
    "Ehliyet Bitiş": fmtDate(d.licenseExpiryDate),
    "Pasaport Bitiş": fmtDate(d.passportExpiryDate),
    "Psikoteknik Bitiş": fmtDate(d.psychotechnicExpiryDate),
    "Kullanım Türü": d.usageType ?? "",
    "Mülkiyet": d.ownershipType ?? "",
    Durum: d.isActive ? "Aktif" : "Pasif",
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="Sürücüler" onAdd={() => { setEditing(null); setFormOpen(true); }}
        actions={<ExcelExport data={exportData} fileName="suruculer" label="Excel İndir" />}
      />
      {loading ? <p className="text-white/40">Yükleniyor...</p> : <DataTable columns={columns} data={data} searchKey="fullName" searchPlaceholder="İsim ara..." filters={driverFilters} />}
      <DriverForm open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchData} initialData={editing} />
      <ConfirmDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)} onConfirm={handleDelete} description="Bu sürücüyü silmek istediğinize emin misiniz?" />
    </div>
  );
}
