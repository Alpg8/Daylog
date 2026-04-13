"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Truck, Users, Package } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type OrderRow = {
  id: string;
  cargoNumber: string | null;
  tripNumber: string | null;
  status: string;
  routeText: string | null;
  loadingDate: string | null;
  vehicle: { plateNumber: string } | null;
  driver: { fullName: string } | null;
};

type VehicleRow = {
  id: string;
  plateNumber: string;
  brand: string | null;
  model: string | null;
  status: string;
  _count?: { orders: number; drivers: number };
};

type DriverRow = {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  isActive: boolean;
  assignedVehicle: { plateNumber: string } | null;
  user: { email: string; role: string } | null;
};

const statusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
  if (status === "IN_PROGRESS") return "default";
  if (status === "COMPLETED") return "secondary";
  if (status === "CANCELLED") return "destructive";
  return "outline";
};

export function OperationsOverview() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderTotal, setOrderTotal] = useState(0);
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);

  const fetchAll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setLoading(true);
    try {
      const [ordersRes, vehiclesRes, driversRes] = await Promise.all([
        fetch("/api/orders?page=1&pageSize=500"),
        fetch("/api/vehicles"),
        fetch("/api/drivers"),
      ]);

      if (ordersRes.ok) {
        const data = (await ordersRes.json()) as { orders?: OrderRow[]; total?: number };
        setOrders(data.orders ?? []);
        setOrderTotal(data.total ?? data.orders?.length ?? 0);
      }

      if (vehiclesRes.ok) {
        const data = (await vehiclesRes.json()) as { vehicles?: VehicleRow[] };
        setVehicles(data.vehicles ?? []);
      }

      if (driversRes.ok) {
        const data = (await driversRes.json()) as { drivers?: DriverRow[] };
        setDrivers(data.drivers ?? []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status === "PLANNED" || order.status === "IN_PROGRESS").length,
    [orders]
  );

  const orderColumns: ColumnDef<OrderRow>[] = [
    {
      accessorKey: "cargoNumber",
      header: "Yuk",
      cell: ({ row }) => row.original.cargoNumber || row.original.tripNumber || "-",
    },
    {
      accessorKey: "status",
      header: "Durum",
      cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>,
    },
    {
      accessorKey: "vehicle",
      header: "Arac",
      cell: ({ row }) => row.original.vehicle?.plateNumber ?? "-",
    },
    {
      accessorKey: "driver",
      header: "Sofor",
      cell: ({ row }) => row.original.driver?.fullName ?? "-",
    },
    {
      accessorKey: "routeText",
      header: "Guzergah",
      cell: ({ row }) => row.original.routeText ?? "-",
    },
    {
      accessorKey: "loadingDate",
      header: "Yukleme",
      cell: ({ row }) =>
        row.original.loadingDate ? new Date(row.original.loadingDate).toLocaleDateString("tr-TR") : "-",
    },
  ];

  const vehicleColumns: ColumnDef<VehicleRow>[] = [
    { accessorKey: "plateNumber", header: "Plaka" },
    {
      accessorKey: "brand",
      header: "Marka / Model",
      cell: ({ row }) => `${row.original.brand ?? "-"} ${row.original.model ?? ""}`.trim(),
    },
    {
      accessorKey: "status",
      header: "Durum",
      cell: ({ row }) => <Badge variant={row.original.status === "ACTIVE" ? "default" : "secondary"}>{row.original.status}</Badge>,
    },
    {
      id: "orderCount",
      header: "Is Sayisi",
      cell: ({ row }) => row.original._count?.orders ?? 0,
    },
    {
      id: "driverCount",
      header: "Atanan Sofor",
      cell: ({ row }) => row.original._count?.drivers ?? 0,
    },
  ];

  const driverColumns: ColumnDef<DriverRow>[] = [
    { accessorKey: "fullName", header: "Sofor" },
    {
      accessorKey: "phoneNumber",
      header: "Telefon",
      cell: ({ row }) => row.original.phoneNumber ?? "-",
    },
    {
      accessorKey: "assignedVehicle",
      header: "Atanan Arac",
      cell: ({ row }) => row.original.assignedVehicle?.plateNumber ?? "-",
    },
    {
      accessorKey: "user",
      header: "Kullanici",
      cell: ({ row }) => row.original.user?.email ?? "-",
    },
    {
      accessorKey: "isActive",
      header: "Durum",
      cell: ({ row }) => <Badge variant={row.original.isActive ? "default" : "secondary"}>{row.original.isActive ? "AKTIF" : "PASIF"}</Badge>,
    },
  ];

  return (
    <div className="space-y-4 page-enter">
      <div className="surface-panel flex items-center justify-between rounded-2xl px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">Genel Veri Arayuzu</h2>
          <p className="text-sm text-muted-foreground">Siparis, arac ve sofor listelerine tek yerden bakis</p>
        </div>
        <Button variant="outline" size="icon" onClick={() => fetchAll(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="hover:-translate-y-0.5 transition-transform duration-300">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-sm">Siparisler</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-bold">{orderTotal}</CardContent>
        </Card>
        <Card className="hover:-translate-y-0.5 transition-transform duration-300">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-sm">Araclar</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-bold">{vehicles.length}</CardContent>
        </Card>
        <Card className="hover:-translate-y-0.5 transition-transform duration-300">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-sm">Soforler</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-bold">{drivers.length}</CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="surface-panel h-auto rounded-xl p-1">
          <TabsTrigger value="orders">Siparisler ({orderTotal})</TabsTrigger>
          <TabsTrigger value="vehicles">Araclar ({vehicles.length})</TabsTrigger>
          <TabsTrigger value="drivers">Soforler ({drivers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-2">
          <p className="text-xs text-muted-foreground">Aktif siparis: {activeOrders}</p>
          <DataTable columns={orderColumns} data={orders} loading={loading} searchPlaceholder="Siparis ara..." />
          {orderTotal > orders.length ? (
            <p className="text-xs text-muted-foreground">Not: API sayfalamasi nedeniyle ilk {orders.length} siparis gosteriliyor.</p>
          ) : null}
        </TabsContent>

        <TabsContent value="vehicles">
          <DataTable columns={vehicleColumns} data={vehicles} loading={loading} searchPlaceholder="Arac ara..." />
        </TabsContent>

        <TabsContent value="drivers">
          <DataTable columns={driverColumns} data={drivers} loading={loading} searchPlaceholder="Sofor ara..." />
        </TabsContent>
      </Tabs>
    </div>
  );
}
