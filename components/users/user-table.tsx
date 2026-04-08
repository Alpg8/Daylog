"use client";

import { useCallback, useEffect, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type FilterConfig } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { RoleBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { UserForm } from "./user-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { User } from "@/types";

export function UserTable() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) { const j = await res.json(); setData(j.users ?? []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await fetch(`/api/users/${deletingId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Kullanıcı silindi"); fetchData(); } else { const e = await res.json(); toast.error(e.error ?? "Silinemedi"); }
    setDeletingId(null);
  };

  const columns: ColumnDef<User>[] = [
    { accessorKey: "name", header: "Ad Soyad" },
    { accessorKey: "email", header: "E-posta" },
    { accessorKey: "role", header: "Rol", filterFn: "equals", cell: ({ row }) => <RoleBadge role={row.getValue("role")} /> },
    {
      accessorKey: "isActive", header: "Durum",
      filterFn: (row, id, value) => String(row.getValue(id)) === String(value),
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

  const userFilters: FilterConfig[] = [
    {
      label: "Rol",
      column: "role",
      options: [
        { label: "Admin", value: "ADMIN" },
        { label: "Yönetici", value: "MANAGER" },
        { label: "Kullanıcı", value: "USER" },
      ],
    },
    {
      label: "Durum",
      column: "isActive",
      options: [
        { label: "Aktif", value: "true" },
        { label: "Pasif", value: "false" },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Kullanıcılar" onAdd={() => { setEditing(null); setFormOpen(true); }} />
      {loading ? <p className="text-muted-foreground">Yükleniyor...</p> : <DataTable columns={columns} data={data} searchPlaceholder="E-posta ara..." filters={userFilters} />}
      <UserForm open={formOpen} onOpenChange={setFormOpen} onSuccess={fetchData} initialData={editing} />
      <ConfirmDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)} onConfirm={handleDelete} description="Bu kullanıcıyı silmek istediğinize emin misiniz?" />
    </div>
  );
}
