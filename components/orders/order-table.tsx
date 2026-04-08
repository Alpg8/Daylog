"use client";

import { useState, useEffect, useCallback } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type FilterConfig } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { OrderStatusBadge, VehicleStatusBadge, TrailerStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExcelExport } from "@/components/shared/excel-export";
import { OrderForm } from "@/components/orders/order-form";
import { EntityPopover } from "@/components/shared/entity-popover";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OrderWithRelations, Vehicle, Trailer, Driver } from "@/types";

interface OrderTableProps {
  category?: "DOMESTIC" | "IMPORT" | "EXPORT";
}

const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("tr-TR") : "—";

export function OrderTable({ category }: OrderTableProps) {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderWithRelations | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);

      const [ordersRes, vehiclesRes, trailersRes, driversRes] = await Promise.all([
        fetch(`/api/orders?${params}`),
        fetch("/api/vehicles"),
        fetch("/api/trailers"),
        fetch("/api/drivers"),
      ]);

      const [ordersData, vehiclesData, trailersData, driversData] = await Promise.all([
        ordersRes.json(),
        vehiclesRes.json(),
        trailersRes.json(),
        driversRes.json(),
      ]);

      setOrders(ordersData.orders ?? []);
      setVehicles(vehiclesData.vehicles ?? []);
      setTrailers(trailersData.trailers ?? []);
      setDrivers(driversData.drivers ?? []);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/orders/${deletingId}`, { method: "DELETE" });
      if (res.ok) { toast.success("Sipariş silindi"); fetchData(); }
      else toast.error("Silme işlemi başarısız");
    } finally {
      setDeleteLoading(false);
      setDeletingId(null);
    }
  };

  const categoryTitle = {
    DOMESTIC: "Yurtiçi Siparişler",
    IMPORT: "İthalat Siparişleri",
    EXPORT: "İhracat Siparişleri",
  };

  const title = category ? categoryTitle[category] : "Tüm Siparişler";

  const tableFilters: FilterConfig[] = [
    {
      label: "Durum",
      column: "status",
      options: [
        { label: "Bekliyor", value: "PENDING" },
        { label: "Planlandı", value: "PLANNED" },
        { label: "Devam Ediyor", value: "IN_PROGRESS" },
        { label: "Tamamlandı", value: "COMPLETED" },
        { label: "İptal", value: "CANCELLED" },
      ],
    },
    ...(!category ? [{
      label: "Kategori",
      column: "orderCategory",
      options: [
        { label: "Yurtiçi", value: "DOMESTIC" },
        { label: "İthalat", value: "IMPORT" },
        { label: "İhracat", value: "EXPORT" },
      ],
    }] : []),
  ];

  const columns: ColumnDef<OrderWithRelations>[] = [
    {
      accessorKey: "orderCategory",
      header: "Kategori",
      filterFn: "equals",
      cell: ({ row }) => {
        const cat = row.original.orderCategory;
        const labels = { DOMESTIC: "Yurtiçi", IMPORT: "İthalat", EXPORT: "İhracat" };
        return <span className="text-xs text-white/60">{labels[cat]}</span>;
      },
    },
    { accessorKey: "cargoNumber", header: "Yük No" },
    { accessorKey: "tripNumber", header: "Sefer No" },
    { accessorKey: "customerName", header: "Müşteri" },
    { accessorKey: "routeText", header: "Güzergah" },
    {
      id: "vehicle",
      header: "Araç",
      cell: ({ row }) => {
        const v = row.original.vehicle;
        if (!v) return <span className="text-white/30">—</span>;
        return (
          <EntityPopover
            trigger={v.plateNumber}
            title={v.plateNumber}
            subtitle={<VehicleStatusBadge status={v.status} />}
            items={[
              { label: "Marka", value: v.brand ?? "—" },
              { label: "Model", value: v.model ?? "—" },
              { label: "Kullanım", value: v.usageType ?? "—" },
              { label: "Mülkiyet", value: v.ownershipType ?? "—" },
            ]}
          />
        );
      },
    },
    {
      id: "trailer",
      header: "Dorse",
      cell: ({ row }) => {
        const t = row.original.trailer;
        if (!t) return <span className="text-white/30">—</span>;
        return (
          <EntityPopover
            trigger={t.plateNumber}
            title={t.plateNumber}
            subtitle={<TrailerStatusBadge status={t.status} />}
            items={[
              { label: "Tip", value: t.type ?? "—" },
              { label: "Notlar", value: t.notes ?? "—" },
            ]}
          />
        );
      },
    },
    {
      id: "driver",
      header: "Sürücü",
      cell: ({ row }) => {
        const d = row.original.driver;
        if (!d) return <span className="text-white/30">—</span>;
        return (
          <EntityPopover
            trigger={d.fullName}
            title={d.fullName}
            items={[
              { label: "Telefon", value: d.phoneNumber ?? "—" },
              { label: "Kullanım", value: d.usageType ?? "—" },
              { label: "Ehliyet Bitiş", value: fmtDate(d.licenseExpiryDate) },
              { label: "Pasaport Bitiş", value: fmtDate(d.passportExpiryDate) },
              { label: "Psikoteknik", value: fmtDate(d.psychotechnicExpiryDate) },
            ]}
          />
        );
      },
    },
    {
      accessorKey: "loadingDate",
      header: "Yükleme",
      cell: ({ row }) => row.original.loadingDate
        ? format(new Date(row.original.loadingDate), "dd.MM.yyyy") : "—",
    },
    {
      accessorKey: "status",
      header: "Durum",
      filterFn: "equals",
      cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingOrder(row.original); setFormOpen(true); }}>
              <Pencil className="mr-2 h-4 w-4" /> Düzenle
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeletingId(row.original.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const exportData = orders.map((o) => ({
    kategori: o.orderCategory,
    yuk_no: o.cargoNumber ?? "",
    sefer_no: o.tripNumber ?? "",
    musteri: o.customerName ?? "",
    guzergah: o.routeText ?? "",
    arac: o.vehicle?.plateNumber ?? "",
    sure: o.driver?.fullName ?? "",
    yukleme_tarihi: o.loadingDate ? format(new Date(o.loadingDate), "dd.MM.yyyy") : "",
    durum: o.status,
  }));

  const exportColumns = [
    { key: "kategori", header: "Kategori" },
    { key: "yuk_no", header: "Yük No" },
    { key: "sefer_no", header: "Sefer No" },
    { key: "musteri", header: "Müşteri" },
    { key: "guzergah", header: "Güzergah" },
    { key: "arac", header: "Araç" },
    { key: "sure", header: "Sürücü" },
    { key: "yukleme_tarihi", header: "Yükleme Tarihi" },
    { key: "durum", header: "Durum" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={`${orders.length} sipariş`}
        onAdd={() => { setEditingOrder(null); setFormOpen(true); }}
        actions={
          <ExcelExport data={exportData} columns={exportColumns} fileName="siparisler" />
        }
      />

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        searchPlaceholder="Sipariş ara (müşteri, yük no, sefer no...)"
        filters={tableFilters}
      />

      <OrderForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingOrder(null);
        }}
        onSuccess={fetchData}
        initialData={editingOrder}
        defaultCategory={category}
        vehicles={vehicles}
        trailers={trailers}
        drivers={drivers}
      />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Siparişi sil"
        description="Bu sipariş kalıcı olarak silinecektir. Bu işlem geri alınamaz."
      />
    </div>
  );
}
