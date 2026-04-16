"use client";

import { useCallback, useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type FilterConfig } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { TrailerStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExcelExport } from "@/components/shared/excel-export";
import { ExcelImportDialog } from "@/components/shared/excel-import-dialog";
import { AttachmentManager } from "@/components/shared/attachment-manager";
import { TRAILER_ATTACHMENT_LABEL_OPTIONS } from "@/lib/document-presets";
import { TrailerForm } from "./trailer-form";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Trailer } from "@/types";

const LIVE_UPDATE_EVENT = "daylog:live-update";

export function TrailerTable() {
  const [data, setData] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Trailer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trailers", { cache: "no-store" });
      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok || !contentType.includes("application/json")) {
        throw new Error("Dorse verisi alinamadi");
      }

      const j = (await res.json()) as { trailers?: Trailer[] };
      setData(j.trailers ?? []);
    } catch {
      setData([]);
      toast.error("Dorseler yuklenemedi");
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
            <DropdownMenuItem asChild>
              <Link href={`/trailers/${row.original.id}`}>Dorse Detay</Link>
            </DropdownMenuItem>
            <div className="px-2 py-1.5">
              <AttachmentManager
                title={`${row.original.plateNumber} Dosyalari`}
                description="Dorseye ait belge ve evraklari yonetin."
                entityId={row.original.id}
                endpointBase="/api/trailers"
                triggerClassName="h-auto w-full justify-start gap-2 rounded-sm border-0 bg-transparent px-0 py-0 text-sm font-normal shadow-none hover:bg-transparent"
                labelOptions={TRAILER_ATTACHMENT_LABEL_OPTIONS}
              />
            </div>
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
        actions={
          <div className="flex items-center gap-2">
            <ExcelImportDialog
              title="Dorseleri Excel'den İçe Aktar"
              endpoint="/api/trailers"
              onSuccess={fetchData}
              templateFileName="dorse-sablonu"
              templateRow={{
                "Plaka": "34 XX 0000",
                "Tip": "Tenteli",
                "Durum": "AVAILABLE",
                "Notlar": "",
              }}
              columns={[
                { headers: ["Plaka", "plaka", "plate", "platenumber"], key: "plateNumber", label: "Plaka", required: true },
                { headers: ["Tip", "type", "dorse tipi"], key: "type", label: "Tip" },
                { headers: ["Durum", "status"], key: "status", label: "Durum" },
                { headers: ["Notlar", "not", "notes"], key: "notes", label: "Notlar" },
              ]}
            />
            <ExcelExport data={exportData} fileName="dorseler" label="Excel İndir" />
          </div>
        }
      />
      {loading ? <p className="text-white/40">Yükleniyor...</p> : <DataTable columns={columns} data={data} searchPlaceholder="Plaka ara..." filters={trailerFilters} />}
      <TrailerForm open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchData} initialData={editing} />
      <ConfirmDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)} onConfirm={handleDelete} description="Bu dorseyi silmek istediğinize emin misiniz?" />
    </div>
  );
}
