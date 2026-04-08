"use client";

import { useCallback, useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type FilterConfig } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { TrailerStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExcelExport } from "@/components/shared/excel-export";
import { TrailerForm } from "./trailer-form";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Trailer } from "@/types";

export function TrailerTable() {
  const [data, setData] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Trailer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/trailers");
    if (res.ok) { const j = await res.json(); setData(j.trailers ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await fetch(`/api/trailers/${deletingId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Dorse silindi"); fetchData(); } else { toast.error("Silinemedi"); }
    setDeletingId(null);
  };

  const trailerFilters: FilterConfig[] = [
    {
      label: "Durum",
      column: "status",
      options: [
        { label: "Müsait", value: "AVAILABLE" },
        { label: "Kullanımda", value: "IN_USE" },
        { label: "Bakımda", value: "MAINTENANCE" },
        { label: "Satıldı", value: "SOLD" },
      ],
    },
    {
      label: "Tip",
      column: "type",
      options: [
        { label: "Tenteli", value: "TENTELI" },
        { label: "Frigorifik", value: "FRIGORIFIK" },
        { label: "Damperli", value: "DAMPERLI" },
        { label: "Konteyner", value: "KONTEYNER" },
      ],
    },
  ];

  const columns: ColumnDef<Trailer>[] = [
    { accessorKey: "plateNumber", header: "Plaka" },
    { accessorKey: "type", header: "Tip", filterFn: "equals", cell: ({ row }) => row.getValue("type") || "—" },
    { accessorKey: "status", header: "Durum", filterFn: "equals", cell: ({ row }) => <TrailerStatusBadge status={row.getValue("status")} /> },
    { accessorKey: "notes", header: "Notlar", cell: ({ row }) => <span className="text-white/40 text-sm">{row.getValue("notes") || "—"}</span> },
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

  const exportData = data.map(t => ({ Plaka: t.plateNumber, Tip: t.type ?? "", Durum: t.status, Notlar: t.notes ?? "" }));

  return (
    <div className="space-y-4">
      <PageHeader title="Dorseler" onAdd={() => { setEditing(null); setFormOpen(true); }}
        actions={<ExcelExport data={exportData} fileName="dorseler" label="Excel İndir" />}
      />
      {loading ? <p className="text-white/40">Yükleniyor...</p> : <DataTable columns={columns} data={data} searchKey="plateNumber" searchPlaceholder="Plaka ara..." filters={trailerFilters} />}
      <TrailerForm open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchData} initialData={editing} />
      <ConfirmDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)} onConfirm={handleDelete} description="Bu dorseyi silmek istediğinize emin misiniz?" />
    </div>
  );
}
