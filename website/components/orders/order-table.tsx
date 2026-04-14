"use client";

import { useState, useEffect, useCallback } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { format } from "date-fns";
import { Loader2, MoreHorizontal, Pencil, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { DataTable, type FilterConfig } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { VehicleStatusBadge, TrailerStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExcelExport } from "@/components/shared/excel-export";
import { OrderForm } from "@/components/orders/order-form";
import { EntityPopover } from "@/components/shared/entity-popover";
import { AttachmentManager } from "@/components/shared/attachment-manager";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrderWithRelations, Vehicle, Trailer, Driver } from "@/types";

interface OrderTableProps {
  category?: "DOMESTIC" | "IMPORT" | "EXPORT";
}

const LIVE_UPDATE_EVENT = "daylog:live-update";

const fmtDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("tr-TR") : "—";

const statusCellClassMap: Record<string, string> = {
  PENDING: "bg-amber-100 border-amber-200 text-amber-900",
  PLANNED: "bg-sky-100 border-sky-200 text-sky-900",
  IN_PROGRESS: "bg-blue-100 border-blue-200 text-blue-900",
  COMPLETED: "bg-emerald-100 border-emerald-200 text-emerald-900",
  CANCELLED: "bg-rose-100 border-rose-200 text-rose-900",
};

const statusLabelMap: Record<string, string> = {
  PENDING: "Bekliyor",
  PLANNED: "Planlandi",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandi",
  CANCELLED: "Iptal",
};

export function OrderTable({ category }: OrderTableProps) {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderWithRelations | null>(null);
  const [assigningOrder, setAssigningOrder] = useState<OrderWithRelations | null>(null);
  const [assignDriverId, setAssignDriverId] = useState("__none__");
  const [assignLoading, setAssignLoading] = useState(false);
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

  useEffect(() => {
    const handleLiveUpdate = () => {
      void fetchData();
    };

    window.addEventListener(LIVE_UPDATE_EVENT, handleLiveUpdate);
    return () => window.removeEventListener(LIVE_UPDATE_EVENT, handleLiveUpdate);
  }, [fetchData]);

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

  const handleCellEdit = async (rowIndex: number, columnId: string, value: string) => {
    const order = orders[rowIndex];
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [columnId]: value }),
      });
      if (res.ok) {
        toast.success("Kaydedildi");
        fetchData();
      } else {
        toast.error("Kaydedilemedi");
      }
    } catch {
      toast.error("Bağlantı hatası");
    }
  };

  const openAssignDialog = (order: OrderWithRelations) => {
    setAssigningOrder(order);
    setAssignDriverId(order.driverId ?? "__none__");
  };

  const handleAssignDriver = async () => {
    if (!assigningOrder) return;

    setAssignLoading(true);
    try {
      const response = await fetch(`/api/orders/${assigningOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: assignDriverId === "__none__" ? null : assignDriverId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Surucu atanamadi");
      }

      toast.success(assignDriverId === "__none__" ? "Surucu atamasi kaldirildi" : "Surucu atandi");
      setAssigningOrder(null);
      setAssignDriverId("__none__");
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Surucu atamasi basarisiz");
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Ortak hücreler ────────────────────────────────────────────────
  const vehicleCell: ColumnDef<OrderWithRelations> = {
    id: "vehicle", header: "Çekici",
    cell: ({ row }) => {
      const v = row.original.vehicle;
      if (!v) return <span className="text-muted-foreground/40">—</span>;
      return (
        <EntityPopover trigger={v.plateNumber} title={v.plateNumber}
          subtitle={<VehicleStatusBadge status={v.status} />}
          items={[{ label: "Marka", value: v.brand ?? "—" }, { label: "Model", value: v.model ?? "—" }]}
        />
      );
    },
  };

  const trailerCell: ColumnDef<OrderWithRelations> = {
    id: "trailer", header: "Dorse",
    cell: ({ row }) => {
      const t = row.original.trailer;
      if (!t) return <span className="text-muted-foreground/40">—</span>;
      return (
        <EntityPopover trigger={t.plateNumber} title={t.plateNumber}
          subtitle={<TrailerStatusBadge status={t.status} />}
          items={[{ label: "Tip", value: t.type ?? "—" }]}
        />
      );
    },
  };

  const driverCell: ColumnDef<OrderWithRelations> = {
    id: "driver", header: "Sürücü Adı",
    cell: ({ row }) => {
      const d = row.original.driver;
      if (!d) return <span className="text-muted-foreground/40">—</span>;
      return (
        <EntityPopover trigger={d.fullName} title={d.fullName}
          items={[
            { label: "Telefon", value: d.phoneNumber ?? "—" },
            { label: "Ehliyet Bitiş", value: fmtDate(d.licenseExpiryDate) },
            { label: "Pasaport Bitiş", value: fmtDate(d.passportExpiryDate) },
          ]}
        />
      );
    },
  };

  const statusCell: ColumnDef<OrderWithRelations> = {
    accessorKey: "status", header: "Durum", filterFn: "equals",
    cell: ({ row }) => (
      <div className={`rounded-md border px-3 py-2 text-center ${statusCellClassMap[row.original.status] ?? "bg-muted"}`}>
        <span className="text-xs font-semibold">{statusLabelMap[row.original.status] ?? row.original.status}</span>
      </div>
    ),
  };

  const actionsCell: ColumnDef<OrderWithRelations> = {
    id: "actions", header: "",
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => openAssignDialog(row.original)}
        >
          <UserPlus className="h-4 w-4" />
          {row.original.driver ? "Surucu Degistir" : "Surucu Ata"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setEditingOrder(row.original); setFormOpen(true); }}>
              <Pencil className="mr-2 h-4 w-4" /> Düzenle
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/orders/${row.original.id}`}>Operasyon Detay</Link>
            </DropdownMenuItem>
            <div className="px-2 py-1.5">
              <AttachmentManager
                title="Siparis Dosyalari"
                description="Siparise ait CMR, fatura ve diger operasyon belgelerini yonetin."
                entityId={row.original.id}
                endpointBase="/api/orders"
                triggerClassName="h-auto w-full justify-start gap-2 rounded-sm border-0 bg-transparent px-0 py-0 text-sm font-normal shadow-none hover:bg-transparent"
              />
            </div>
            <DropdownMenuItem className="text-destructive" onClick={() => setDeletingId(row.original.id)}>
              <Trash2 className="mr-2 h-4 w-4" /> Sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  };

  const fmtNum = (v: unknown) => (v != null && v !== "" ? String(v) : "—");

  // ── EXPORT kolonları ──────────────────────────────────────────────
  const exportColumns: ColumnDef<OrderWithRelations>[] = [
    { accessorKey: "serialNumber", header: "NO", cell: ({ row }) => fmtNum(row.original.serialNumber) },
    { accessorKey: "loadingDate", header: "Yükleme Tarihi", cell: ({ row }) => fmtDate(row.original.loadingDate) },
    { accessorKey: "borderExitDate", header: "Kapıkule Çıkış", cell: ({ row }) => fmtDate((row.original as OrderWithRelations & { borderExitDate?: string | Date | null }).borderExitDate) },
    { accessorKey: "unloadingDate", header: "Boşaltma Tarihi", cell: ({ row }) => fmtDate(row.original.unloadingDate) },
    vehicleCell, trailerCell, driverCell,
    { accessorKey: "customerName", header: "Müşteri", meta: { editable: true } },
    { accessorKey: "referenceNumber", header: "REF", meta: { editable: true } },
    { accessorKey: "transportType", header: "Taşıma Tipi", meta: { editable: true } },
    { accessorKey: "cargoNumber", header: "Yük Numarası", meta: { editable: true } },
    { accessorKey: "tripNumber", header: "Sefer No", meta: { editable: true } },
    { accessorKey: "invoiceNumber", header: "Fatura No", meta: { editable: true } },
    { accessorKey: "routeText", header: "Güzergah", meta: { editable: true } },
    { accessorKey: "customsGate", header: "Gümrük/Çıkış Kapısı", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).customsGate) },
    { accessorKey: "sender", header: "Gönderici", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).sender) },
    { accessorKey: "recipient", header: "Alıcı", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).recipient) },
    { accessorKey: "loadingCountry", header: "Yükleme Ülkesi", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).loadingCountry) },
    { accessorKey: "unloadingCountry", header: "Boşaltma Ülkesi", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).unloadingCountry) },
    { accessorKey: "waitingPrice", header: "Bekleme Fiyatı", meta: { editable: true, type: "number" }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).waitingPrice) },
    { accessorKey: "freightPrice", header: "Nakliye Fiyatı", meta: { editable: true, type: "number" }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).freightPrice) },
    { accessorKey: "customsCost", header: "Gümrük Masrafı", meta: { editable: true, type: "number" }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).customsCost) },
    { accessorKey: "supplyPrice", header: "Tedarik Fiyatı", meta: { editable: true, type: "number" }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).supplyPrice) },
    statusCell, actionsCell,
  ];

  // ── DOMESTIC kolonları ────────────────────────────────────────────
  const domesticColumns: ColumnDef<OrderWithRelations>[] = [
    { accessorKey: "serialNumber", header: "NO", cell: ({ row }) => fmtNum(row.original.serialNumber) },
    { accessorKey: "loadingDate", header: "Başlangıç", cell: ({ row }) => fmtDate(row.original.loadingDate) },
    { accessorKey: "unloadingDate", header: "Bitiş", cell: ({ row }) => fmtDate(row.original.unloadingDate) },
    vehicleCell, trailerCell, driverCell,
    { accessorKey: "sender", header: "Gönderici", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).sender) },
    { accessorKey: "rental", header: "Kiralık", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).rental) },
    { accessorKey: "referenceNumber", header: "REF", meta: { editable: true } },
    { accessorKey: "transportType", header: "Taşıma Tipi", meta: { editable: true } },
    { accessorKey: "positionNumber", header: "Pozisyon", meta: { editable: true } },
    { accessorKey: "invoiceNumber", header: "Fatura No", meta: { editable: true } },
    { accessorKey: "containerTrailerNo", header: "Konteynır-Dorse", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).containerTrailerNo) },
    { accessorKey: "containerPickupAddress", header: "Kntr. Alınacak Adres", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).containerPickupAddress) },
    { accessorKey: "loadUnloadLocation", header: "Yük-Boş Yer", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).loadUnloadLocation) },
    { accessorKey: "customs", header: "Gümrük", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).customs) },
    { accessorKey: "containerDropAddress", header: "Kntr. Bırakılacak Adres", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).containerDropAddress) },
    { accessorKey: "deliveryCustomer", header: "Varış Müşterisi", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).deliveryCustomer) },
    { accessorKey: "waitingDays", header: "Bekleme Gün", meta: { editable: true, type: "number" }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).waitingDays) },
    { accessorKey: "freightSalePrice", header: "Nakliye Satış Fiy.", meta: { editable: true, type: "number" }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).freightSalePrice) },
    { accessorKey: "waitingCustomsPrice", header: "Bkl. Güm. Fiy.", meta: { editable: true, type: "number" }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).waitingCustomsPrice) },
    { accessorKey: "customsKantarPrice", header: "Güm-Kant Fiy.", meta: { editable: true, type: "number" }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).customsKantarPrice) },
    { accessorKey: "supplierSalePrice", header: "Tedarikçi Sat. Fiy.", meta: { editable: true, type: "number" }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).supplierSalePrice) },
    { accessorKey: "transportProfitRate", header: "Kar Oranı", meta: { editable: true, type: "number" }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).transportProfitRate) },
    { accessorKey: "supplierInfo", header: "Tedarikçi Bilgi", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).supplierInfo) },
    { accessorKey: "supplierPhone", header: "Tedarikçi Cep", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).supplierPhone) },
    { accessorKey: "equipmentInfo", header: "Ekipman", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).equipmentInfo) },
    { accessorKey: "cita", header: "ÇITA", meta: { editable: true }, cell: ({ row }) => fmtNum(row.original.cita) },
    statusCell, actionsCell,
  ];

  // ── IMPORT kolonları ──────────────────────────────────────────────
  const importColumns: ColumnDef<OrderWithRelations>[] = [
    { accessorKey: "loadingDate", header: "Başlangıç Tarihi", cell: ({ row }) => fmtDate(row.original.loadingDate) },
    { accessorKey: "unloadingDate", header: "Bitiş Tarihi", cell: ({ row }) => fmtDate(row.original.unloadingDate) },
    { accessorKey: "transportType", header: "Taşıma Tipi", meta: { editable: true } },
    { accessorKey: "supply", header: "Tedarik", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).supply) },
    vehicleCell, trailerCell, driverCell,
    { accessorKey: "cargoNumber", header: "Yük Pozisyon No", meta: { editable: true } },
    { accessorKey: "tripNumber", header: "Sefer Pozisyon No", meta: { editable: true } },
    { accessorKey: "invoiceNumber", header: "Fatura No", meta: { editable: true } },
    { accessorKey: "routeText", header: "Güzergah", meta: { editable: true } },
    { accessorKey: "customs", header: "Gümrük", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).customs) },
    { accessorKey: "customerName", header: "Müşteri", meta: { editable: true } },
    { accessorKey: "sender", header: "Gönderici", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).sender) },
    { accessorKey: "recipient", header: "Alıcı", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).recipient) },
    { accessorKey: "loadingCountry", header: "Yükleme Ülkesi", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).loadingCountry) },
    { accessorKey: "loadingCity", header: "Yükleme Şehri", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).loadingCity) },
    { accessorKey: "unloadingCountry", header: "Boşaltma Ülkesi", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).unloadingCountry) },
    { accessorKey: "unloadingCity", header: "Boşaltma Şehri", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).unloadingCity) },
    { accessorKey: "unloadingWarehouse", header: "Boşaltma Antrepo", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).unloadingWarehouse) },
    { accessorKey: "orderNumber", header: "Order Numarası", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).orderNumber) },
    { accessorKey: "notes", header: "Not", meta: { editable: true }, cell: ({ row }) => fmtNum(row.original.notes) },
    { accessorKey: "purchasePrice", header: "Alış Fiyatı", meta: { editable: true, type: "number" }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).purchasePrice) },
    { accessorKey: "salePrice", header: "Satış Fiyatı", meta: { editable: true, type: "number" }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).salePrice) },
    { accessorKey: "t2MrnNo", header: "T2 MRN No", meta: { editable: true }, cell: ({ row }) => fmtNum((row.original as Record<string, unknown>).t2MrnNo) },
    statusCell, actionsCell,
  ];

  // ── Tüm siparişler (kategori seçilmemiş) ─────────────────────────
  const allColumns: ColumnDef<OrderWithRelations>[] = [
    {
      accessorKey: "orderCategory", header: "Kategori", filterFn: "equals",
      cell: ({ row }) => {
        const labels = { DOMESTIC: "Yurtiçi", IMPORT: "İthalat", EXPORT: "İhracat" };
        return <span className="text-xs text-muted-foreground">{labels[row.original.orderCategory]}</span>;
      },
    },
    { accessorKey: "cargoNumber", header: "Yük No", meta: { editable: true } },
    { accessorKey: "tripNumber", header: "Sefer No", meta: { editable: true } },
    { accessorKey: "customerName", header: "Müşteri", meta: { editable: true } },
    { accessorKey: "routeText", header: "Güzergah", meta: { editable: true } },
    vehicleCell, trailerCell, driverCell,
    { accessorKey: "loadingDate", header: "Yükleme", cell: ({ row }) => fmtDate(row.original.loadingDate) },
    statusCell, actionsCell,
  ];

  const columns =
    category === "EXPORT" ? exportColumns :
    category === "IMPORT" ? importColumns :
    category === "DOMESTIC" ? domesticColumns :
    allColumns;

  // ── Excel export verisi ───────────────────────────────────────────
  const excelData = orders.map((o) => {
    const r = o as Record<string, unknown>;
    if (category === "EXPORT") return {
      no: o.serialNumber ?? "", yukleme_tarihi: fmtDate(o.loadingDate),
      kapikule_cikis: fmtDate((r.borderExitDate as string | Date | null | undefined)),
      bosaltma_tarihi: fmtDate(o.unloadingDate),
      cekici: o.vehicle?.plateNumber ?? "", dorse: o.trailer?.plateNumber ?? "",
      surucu: o.driver?.fullName ?? "", musteri: o.customerName ?? "",
      ref: o.referenceNumber ?? "", tasima_tipi: o.transportType ?? "",
      yuk_no: o.cargoNumber ?? "", sefer_no: o.tripNumber ?? "",
      fatura_no: o.invoiceNumber ?? "", guzergah: o.routeText ?? "",
      gumruk_cikis: String(r.customsGate ?? ""), gonderici: String(r.sender ?? ""),
      alici: String(r.recipient ?? ""), yukleme_ulkesi: String(r.loadingCountry ?? ""),
      bosaltma_ulkesi: String(r.unloadingCountry ?? ""),
      bekleme_fiyati: r.waitingPrice ?? "", nakliye_fiyati: r.freightPrice ?? "",
      gumruk_masrafi: r.customsCost ?? "", tedarik_fiyati: r.supplyPrice ?? "",
    };
    if (category === "IMPORT") return {
      baslangic: fmtDate(o.loadingDate), bitis: fmtDate(o.unloadingDate),
      tasima_tipi: o.transportType ?? "", tedarik: String(r.supply ?? ""),
      cekici: o.vehicle?.plateNumber ?? "", dorse: o.trailer?.plateNumber ?? "",
      surucu: o.driver?.fullName ?? "", taşima_tipi2: o.transportType ?? "",
      yuk_pozisyon: o.cargoNumber ?? "", sefer_pozisyon: o.tripNumber ?? "",
      fatura_no: o.invoiceNumber ?? "", guzergah: o.routeText ?? "",
      gumruk: String(r.customs ?? ""), musteri: o.customerName ?? "",
      gonderici: String(r.sender ?? ""), alici: String(r.recipient ?? ""),
      yukleme_ulkesi: String(r.loadingCountry ?? ""), yukleme_sehri: String(r.loadingCity ?? ""),
      bosaltma_ulkesi: String(r.unloadingCountry ?? ""), bosaltma_sehri: String(r.unloadingCity ?? ""),
      bosaltma_antrepo: String(r.unloadingWarehouse ?? ""), order_no: String(r.orderNumber ?? ""),
      not: o.notes ?? "", alis_fiyati: r.purchasePrice ?? "", satis_fiyati: r.salePrice ?? "",
      t2_mrn: String(r.t2MrnNo ?? ""),
    };
    if (category === "DOMESTIC") return {
      no: o.serialNumber ?? "", baslangic: fmtDate(o.loadingDate), bitis: fmtDate(o.unloadingDate),
      cekici: o.vehicle?.plateNumber ?? "", dorse: o.trailer?.plateNumber ?? "",
      surucu: o.driver?.fullName ?? "", gonderici: String(r.sender ?? ""),
      kiralik: String(r.rental ?? ""), ref: o.referenceNumber ?? "",
      tasima_tipi: o.transportType ?? "", pozisyon: o.positionNumber ?? "",
      fatura_no: o.invoiceNumber ?? "", konteyner_dorse: String(r.containerTrailerNo ?? ""),
      kntr_alinacak: String(r.containerPickupAddress ?? ""), yuk_bos_yer: String(r.loadUnloadLocation ?? ""),
      gumruk: String(r.customs ?? ""), kntr_birakilacak: String(r.containerDropAddress ?? ""),
      varis_musterisi: String(r.deliveryCustomer ?? ""), bekleme_gun: r.waitingDays ?? "",
      nakliye_satis: r.freightSalePrice ?? "", bekleme_gum: r.waitingCustomsPrice ?? "",
      gum_kant: r.customsKantarPrice ?? "", tedarikci_satis: r.supplierSalePrice ?? "",
      kar_orani: r.transportProfitRate ?? "", tedarikci_bilgi: String(r.supplierInfo ?? ""),
      tedarikci_cep: String(r.supplierPhone ?? ""), ekipman: String(r.equipmentInfo ?? ""),
      cita: o.cita ?? "",
    };
    return {
      kategori: o.orderCategory, yuk_no: o.cargoNumber ?? "",
      sefer_no: o.tripNumber ?? "", musteri: o.customerName ?? "",
      guzergah: o.routeText ?? "", arac: o.vehicle?.plateNumber ?? "",
      surucu: o.driver?.fullName ?? "",
      yukleme_tarihi: fmtDate(o.loadingDate), durum: o.status,
    };
  });

  const excelColumns = Object.keys(excelData[0] ?? {}).map(k => ({ key: k, header: k }));

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={`${orders.length} sipariş`}
        onAdd={() => { setEditingOrder(null); setFormOpen(true); }}
        actions={
          <ExcelExport data={excelData as unknown as Record<string, unknown>[]} columns={excelColumns} fileName="siparisler" />
        }
      />

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        searchPlaceholder="Sipariş ara (müşteri, yük no, sefer no...)"
        filters={tableFilters}
        onCellEdit={handleCellEdit}
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

      <Dialog
        open={!!assigningOrder}
        onOpenChange={(open) => {
          if (!open) {
            setAssigningOrder(null);
            setAssignDriverId("__none__");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sürücü Ata</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {assigningOrder
                ? `${assigningOrder.cargoNumber ?? assigningOrder.tripNumber ?? "Secilen siparis"} icin surucu secin.`
                : "Surucu secin."}
            </p>
            <Select value={assignDriverId} onValueChange={setAssignDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Surucu secin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Surucu atama</SelectItem>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAssigningOrder(null);
                setAssignDriverId("__none__");
              }}
              disabled={assignLoading}
            >
              Vazgec
            </Button>
            <Button type="button" onClick={handleAssignDriver} disabled={assignLoading} className="gap-2">
              {assignLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
