"use client";

import { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { OrderWithRelations, Vehicle, Trailer, Driver } from "@/types";

const str = z.string().optional().nullable();
const num = z.coerce.number().optional().nullable();
const numInt = z.coerce.number().int().optional().nullable();

const formSchema = z.object({
  orderCategory: z.enum(["DOMESTIC", "IMPORT", "EXPORT"]),
  status: z.enum(["PENDING", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  vehicleId: str,
  trailerId: str,
  driverId: str,
  loadingDate: str,
  unloadingDate: str,
  transportType: str,
  referenceNumber: str,
  cargoNumber: str,
  tripNumber: str,
  invoiceNumber: str,
  routeText: str,
  notes: str,
  // İş Tipi + Adresler (sürücüye gösterilen)
  jobType: z.enum(["LOADING", "UNLOADING", "FULL"]).default("LOADING"),
  startAddress: str,
  loadingAddress: str,
  unloadAddress: str,
  deliveryAddress: str,
  // EXPORT
  borderExitDate: str,
  customsGate: str,
  customerName: str,
  sender: str,
  recipient: str,
  loadingCountry: str,
  unloadingCountry: str,
  waitingPrice: num,
  freightPrice: num,
  customsCost: num,
  supplyPrice: num,
  // IMPORT
  supply: str,
  positionNumber: str,
  customs: str,
  loadingCity: str,
  unloadingCity: str,
  unloadingWarehouse: str,
  orderNumber: str,
  purchasePrice: num,
  salePrice: num,
  t2MrnNo: str,
  // DOMESTIC
  serialNumber: numInt,
  rental: str,
  companyName: str,
  containerTrailerNo: str,
  containerPickupAddress: str,
  loadUnloadLocation: str,
  containerDropAddress: str,
  deliveryCustomer: str,
  waitingDays: numInt,
  freightSalePrice: num,
  waitingCustomsPrice: num,
  customsKantarPrice: num,
  supplierSalePrice: num,
  transportProfitRate: num,
  supplierInfo: str,
  supplierPhone: str,
  equipmentInfo: str,
  cita: str,
  spanzetStanga: str,
});

type FormData = z.infer<typeof formSchema>;

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: OrderWithRelations | null;
  defaultCategory?: "DOMESTIC" | "IMPORT" | "EXPORT";
  vehicles: Vehicle[];
  trailers: Trailer[];
  drivers: Driver[];
}

const d = (v: unknown) => (v != null ? String(v) : "");
const dn = (v: unknown) => (v != null && v !== "" ? Number(v) : undefined);
const nilIfBlank = (value: string | null | undefined) => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export function OrderForm({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  defaultCategory = "DOMESTIC",
  vehicles,
  trailers,
  drivers,
}: OrderFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { orderCategory: defaultCategory, status: "PENDING" },
  });

  const category = form.watch("orderCategory");
  const jobType = form.watch("jobType");

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      const o = initialData;
      form.reset({
        orderCategory: o.orderCategory,
        status: o.status,
        vehicleId: o.vehicleId ?? "",
        trailerId: o.trailerId ?? "",
        driverId: o.driverId ?? "",
        loadingDate: o.loadingDate ? new Date(o.loadingDate).toISOString().split("T")[0] : "",
        unloadingDate: o.unloadingDate ? new Date(o.unloadingDate).toISOString().split("T")[0] : "",
        transportType: d(o.transportType),
        referenceNumber: d(o.referenceNumber),
        cargoNumber: d(o.cargoNumber),
        tripNumber: d(o.tripNumber),
        invoiceNumber: d(o.invoiceNumber),
        routeText: d(o.routeText),
        notes: d(o.notes),
        // İş Tipi + Adresler
        jobType: (o as { jobType?: "LOADING" | "UNLOADING" | "FULL" }).jobType ?? "LOADING",
        startAddress: d((o as { phaseStartLocation?: unknown }).phaseStartLocation),
        loadingAddress: d((o as { loadingAddress?: unknown }).loadingAddress),
        unloadAddress: d((o as { phaseUnloadLocation?: unknown }).phaseUnloadLocation),
        deliveryAddress: d((o as { deliveryAddress?: unknown }).deliveryAddress),
        // EXPORT
        borderExitDate: o.borderExitDate ? new Date(o.borderExitDate).toISOString().split("T")[0] : "",
        customsGate: d(o.customsGate),
        customerName: d(o.customerName),
        sender: d(o.sender),
        recipient: d(o.recipient),
        loadingCountry: d(o.loadingCountry),
        unloadingCountry: d(o.unloadingCountry),
        waitingPrice: dn(o.waitingPrice),
        freightPrice: dn(o.freightPrice),
        customsCost: dn(o.customsCost),
        supplyPrice: dn(o.supplyPrice),
        // IMPORT
        supply: d(o.supply),
        positionNumber: d(o.positionNumber),
        customs: d(o.customs),
        loadingCity: d(o.loadingCity),
        unloadingCity: d(o.unloadingCity),
        unloadingWarehouse: d(o.unloadingWarehouse),
        orderNumber: d(o.orderNumber),
        purchasePrice: dn(o.purchasePrice),
        salePrice: dn(o.salePrice),
        t2MrnNo: d(o.t2MrnNo),
        // DOMESTIC
        serialNumber: o.serialNumber ?? undefined,
        rental: d(o.rental),
        companyName: d(o.companyName),
        containerTrailerNo: d(o.containerTrailerNo),
        containerPickupAddress: d(o.containerPickupAddress),
        loadUnloadLocation: d(o.loadUnloadLocation),
        containerDropAddress: d(o.containerDropAddress),
        deliveryCustomer: d(o.deliveryCustomer),
        waitingDays: o.waitingDays ?? undefined,
        freightSalePrice: dn(o.freightSalePrice),
        waitingCustomsPrice: dn(o.waitingCustomsPrice),
        customsKantarPrice: dn(o.customsKantarPrice),
        supplierSalePrice: dn(o.supplierSalePrice),
        transportProfitRate: dn(o.transportProfitRate),
        supplierInfo: d(o.supplierInfo),
        supplierPhone: d(o.supplierPhone),
        equipmentInfo: d(o.equipmentInfo),
        cita: d(o.cita),
        spanzetStanga: d(o.spanzetStanga),
      });
    } else {
      form.reset({ orderCategory: defaultCategory, status: "PENDING" });
    }
  }, [open, initialData, defaultCategory, form]);

  const onSubmit = useCallback(async (data: FormData) => {
    const clean = {
      ...data,
      vehicleId: (!data.vehicleId || data.vehicleId === "__none__") ? null : data.vehicleId,
      trailerId: (!data.trailerId || data.trailerId === "__none__") ? null : data.trailerId,
      driverId: (!data.driverId || data.driverId === "__none__") ? null : data.driverId,
      loadingDate: data.loadingDate || null,
      unloadingDate: data.unloadingDate || null,
      borderExitDate: data.borderExitDate || null,
      loadingAddress: nilIfBlank(data.loadingAddress),
      deliveryAddress: nilIfBlank(data.deliveryAddress),
      phaseStartLocation: nilIfBlank(data.startAddress),
      phaseUnloadLocation: nilIfBlank(data.unloadAddress),
      transportType: nilIfBlank(data.transportType),
      referenceNumber: nilIfBlank(data.referenceNumber),
      cargoNumber: nilIfBlank(data.cargoNumber),
      tripNumber: nilIfBlank(data.tripNumber),
      invoiceNumber: nilIfBlank(data.invoiceNumber),
      routeText: nilIfBlank(data.routeText),
      notes: nilIfBlank(data.notes),
      customsGate: nilIfBlank(data.customsGate),
      customerName: nilIfBlank(data.customerName),
      sender: nilIfBlank(data.sender),
      recipient: nilIfBlank(data.recipient),
      loadingCountry: nilIfBlank(data.loadingCountry),
      unloadingCountry: nilIfBlank(data.unloadingCountry),
      supply: nilIfBlank(data.supply),
      positionNumber: nilIfBlank(data.positionNumber),
      customs: nilIfBlank(data.customs),
      loadingCity: nilIfBlank(data.loadingCity),
      unloadingCity: nilIfBlank(data.unloadingCity),
      unloadingWarehouse: nilIfBlank(data.unloadingWarehouse),
      orderNumber: nilIfBlank(data.orderNumber),
      rental: nilIfBlank(data.rental),
      companyName: nilIfBlank(data.companyName),
      containerTrailerNo: nilIfBlank(data.containerTrailerNo),
      containerPickupAddress: nilIfBlank(data.containerPickupAddress),
      loadUnloadLocation: nilIfBlank(data.loadUnloadLocation),
      containerDropAddress: nilIfBlank(data.containerDropAddress),
      deliveryCustomer: nilIfBlank(data.deliveryCustomer),
      supplierInfo: nilIfBlank(data.supplierInfo),
      supplierPhone: nilIfBlank(data.supplierPhone),
      equipmentInfo: nilIfBlank(data.equipmentInfo),
      cita: nilIfBlank(data.cita),
      spanzetStanga: nilIfBlank(data.spanzetStanga),
    };

    const res = await fetch(
      initialData ? `/api/orders/${initialData.id}` : "/api/orders",
      { method: initialData ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clean) }
    );

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "İşlem başarısız");
      return;
    }

    toast.success(initialData ? "Güncellendi" : "Oluşturuldu");
    onSuccess();
    onOpenChange(false);
  }, [initialData, onSuccess, onOpenChange]);

  // Reusable field helpers
  const F = ({ name, label, placeholder, type = "text", className }: { name: keyof FormData; label: string; placeholder?: string; type?: string; className?: string }) => (
    <FormField control={form.control} name={name} render={({ field }) => (
      <FormItem className={className}>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input type={type} placeholder={placeholder} {...field} value={field.value == null ? "" : String(field.value)} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  const vehicleSelect = (
    <FormField control={form.control} name="vehicleId" render={({ field }) => (
      <FormItem>
        <FormLabel>Çekici</FormLabel>
        <FormControl>
          <Select onValueChange={field.onChange} value={field.value ?? ""}>
            <SelectTrigger><SelectValue placeholder="Araç seçin" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Seçilmedi</SelectItem>
              {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plateNumber}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  const trailerSelect = (
    <FormField control={form.control} name="trailerId" render={({ field }) => (
      <FormItem>
        <FormLabel>Dorse</FormLabel>
        <FormControl>
          <Select onValueChange={field.onChange} value={field.value ?? ""}>
            <SelectTrigger><SelectValue placeholder="Dorse seçin" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Seçilmedi</SelectItem>
              {trailers.map(t => <SelectItem key={t.id} value={t.id}>{t.plateNumber}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  const driverSelect = (
    <FormField control={form.control} name="driverId" render={({ field }) => (
      <FormItem>
        <FormLabel>Sürücü Adı</FormLabel>
        <FormControl>
          <Select onValueChange={field.onChange} value={field.value ?? ""}>
            <SelectTrigger><SelectValue placeholder="Sürücü seçin" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Seçilmedi</SelectItem>
              {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>)}
            </SelectContent>
          </Select>
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  const statusSelect = (
    <FormField control={form.control} name="status" render={({ field }) => (
      <FormItem>
        <FormLabel>Durum</FormLabel>
        <FormControl>
          <Select onValueChange={field.onChange} value={field.value}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Bekliyor</SelectItem>
              <SelectItem value="PLANNED">Planlandı</SelectItem>
              <SelectItem value="IN_PROGRESS">Devam Ediyor</SelectItem>
              <SelectItem value="COMPLETED">Tamamlandı</SelectItem>
              <SelectItem value="CANCELLED">İptal</SelectItem>
            </SelectContent>
          </Select>
        </FormControl>
        <FormMessage />
      </FormItem>
    )} />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" disableAutoFocus>
        <DialogHeader>
          <DialogTitle>{initialData ? "Sipariş Düzenle" : "Yeni Sipariş"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[75vh] pr-4">
              <div className="space-y-4 pb-4">

                {/* Kategori + Durum — her zaman */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="orderCategory" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EXPORT">İhracat (Yurtdışı)</SelectItem>
                            <SelectItem value="DOMESTIC">Yurtiçi</SelectItem>
                            <SelectItem value="IMPORT">İthalat (Yurtdışı)</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {statusSelect}
                </div>

                {/* İş Tipi + Adresler */}
                <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operasyon Tipi</p>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="jobType" render={({ field }) => (
                      <FormItem>
                        <FormLabel>İş Tipi</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="LOADING">Yükleme (Başla → Yükle → Bitir)</SelectItem>
                              <SelectItem value="UNLOADING">Boşaltma (Başla → Boşalt → Bitir)</SelectItem>
                              <SelectItem value="FULL">Yükleme + Boşaltma (Başla → Yükle → Boşalt → Bitir)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {/* LOADING: Yükleme Noktası + Teslim Noktası */}
                    {jobType === "LOADING" && (
                      <>
                        <F name="loadingAddress" label="📍 Yükleme Noktası (Sürücüye gösterilir)" placeholder="Örn: İstanbul, Pendik OSB" />
                        <F name="deliveryAddress" label="📍 Teslim Noktası (Sürücüye gösterilir)" placeholder="Örn: Ankara, Eryaman Depo" />
                      </>
                    )}
                    {/* UNLOADING: Alım Noktası + Boşaltma Noktası */}
                    {jobType === "UNLOADING" && (
                      <>
                        <F name="startAddress" label="📍 Alım Noktası (Sürücüye gösterilir)" placeholder="Örn: İstanbul, Haydarpaşa Liman" />
                        <F name="unloadAddress" label="📍 Boşaltma Noktası (Sürücüye gösterilir)" placeholder="Örn: Ankara, Depo" />
                      </>
                    )}
                    {/* FULL: 4 adres */}
                    {jobType === "FULL" && (
                      <>
                        <F name="startAddress" label="📍 Başlangıç / Alım Noktası" placeholder="Örn: Liman çıkış noktası" />
                        <F name="loadingAddress" label="📍 Yükleme Noktası" placeholder="Örn: İstanbul, Pendik OSB" />
                        <F name="unloadAddress" label="📍 Boşaltma Noktası" placeholder="Örn: Muratbey Depo" />
                        <F name="deliveryAddress" label="📍 Teslim / Bitiş Noktası" placeholder="Örn: Ankara, Eryaman Depo" />
                      </>
                    )}
                  </div>
                </div>

                {/* ────────── EXPORT ────────── */}
                {category === "EXPORT" && (
                  <div className="grid grid-cols-2 gap-4">
                    <F name="loadingDate" label="Yükleme Tarihi" type="date" />
                    <F name="borderExitDate" label="Kapıkule Çıkış Tarihi" type="date" />
                    <F name="unloadingDate" label="Boşaltma Tarihi" type="date" />
                    {vehicleSelect}
                    {trailerSelect}
                    {driverSelect}
                    <F name="customerName" label="Müşteri" />
                    <F name="referenceNumber" label="REF" />
                    <F name="transportType" label="Taşıma Tipi" />
                    <F name="cargoNumber" label="Yük Numarası" />
                    <F name="tripNumber" label="Sefer No" />
                    <F name="invoiceNumber" label="Fatura No" />
                    <F name="routeText" label="Güzergah" />
                    <F name="customsGate" label="Gümrük / Çıkış Kapısı" />
                    <F name="sender" label="Gönderici" />
                    <F name="recipient" label="Alıcı" />
                    <F name="loadingCountry" label="Yükleme Ülkesi" />
                    <F name="unloadingCountry" label="Boşaltma Ülkesi" />
                    <F name="waitingPrice" label="Bekleme Fiyatı" type="number" />
                    <F name="freightPrice" label="Nakliye Fiyatı" type="number" />
                    <F name="customsCost" label="Gümrük Masrafı" type="number" />
                    <F name="supplyPrice" label="Tedarik Fiyatı" type="number" />
                    <div className="col-span-2">
                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem><FormLabel>Açıklama</FormLabel>
                          <FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                )}

                {/* ────────── DOMESTIC ────────── */}
                {category === "DOMESTIC" && (
                  <div className="grid grid-cols-2 gap-4">
                    <F name="serialNumber" label="No" type="number" />
                    <F name="loadingDate" label="Başlangıç" type="date" />
                    <F name="unloadingDate" label="Bitiş" type="date" />
                    {vehicleSelect}
                    {trailerSelect}
                    {driverSelect}
                    <F name="sender" label="Gönderici" />
                    <F name="rental" label="Kiralık" placeholder="OZMAL / KIRALIK" />
                    <F name="referenceNumber" label="REF" />
                    <F name="transportType" label="Taşıma Tipi" />
                    <F name="positionNumber" label="Pozisyon" />
                    <F name="invoiceNumber" label="Fatura No" />
                    <F name="containerTrailerNo" label="Konteynır-Dorse" />
                    <F name="containerPickupAddress" label="Konteynır Alınacak Adres" />
                    <F name="loadUnloadLocation" label="Yük-Boş Yer" />
                    <F name="customs" label="Gümrük" />
                    <F name="containerDropAddress" label="Konteynır Bırakılacak Adres" />
                    <F name="deliveryCustomer" label="Varış Müşterisi" />
                    <F name="waitingDays" label="Bekleme Gün" type="number" />
                    <F name="freightSalePrice" label="Nakliye Satış Fiyatı" type="number" />
                    <F name="waitingCustomsPrice" label="Bekleme Güm. Uğrak Fiyatı" type="number" />
                    <F name="customsKantarPrice" label="Güm-kant Fiyatı" type="number" />
                    <F name="supplierSalePrice" label="Tedarikçi Satış Fiyatı" type="number" />
                    <F name="transportProfitRate" label="Taşıma Kar Oranı" type="number" />
                    <F name="supplierInfo" label="Tedarikçi Bilgileri" />
                    <F name="supplierPhone" label="Tedarikçi Cep No" />
                    <F name="equipmentInfo" label="Ekipman Bilgisi" />
                    <F name="cita" label="ÇITA" />
                    <F name="spanzetStanga" label="Stanga" />
                    <div className="col-span-2">
                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem><FormLabel>Açıklama</FormLabel>
                          <FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                )}

                {/* ────────── IMPORT ────────── */}
                {category === "IMPORT" && (
                  <div className="grid grid-cols-2 gap-4">
                    <F name="loadingDate" label="Başlangıç Tarihi" type="date" />
                    <F name="unloadingDate" label="Bitiş Tarihi" type="date" />
                    <F name="transportType" label="Taşıma Tipi" />
                    <F name="supply" label="Tedarik" />
                    {vehicleSelect}
                    {trailerSelect}
                    {driverSelect}
                    <F name="cargoNumber" label="Yük Pozisyon Numarası" />
                    <F name="tripNumber" label="Sefer Pozisyon Numarası" />
                    <F name="invoiceNumber" label="Fatura Numarası" />
                    <F name="routeText" label="Güzergah" />
                    <F name="customs" label="Gümrük" />
                    <F name="customerName" label="Müşteri" />
                    <F name="sender" label="Gönderici" />
                    <F name="recipient" label="Alıcı" />
                    <F name="loadingCountry" label="Yükleme Ülkesi" />
                    <F name="loadingCity" label="Yükleme Şehri" />
                    <F name="unloadingCountry" label="Boşaltma Ülkesi" />
                    <F name="unloadingCity" label="Boşaltma Şehri" />
                    <F name="unloadingWarehouse" label="Boşaltma Antrepo" />
                    <F name="orderNumber" label="Order Numarası" />
                    <F name="purchasePrice" label="Alış Fiyatı" type="number" />
                    <F name="salePrice" label="Satış Fiyatı" type="number" />
                    <F name="t2MrnNo" label="T2 MRN No" />
                    <div className="col-span-2">
                      <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem><FormLabel>Not / Açıklama</FormLabel>
                          <FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage /></FormItem>
                      )} />
                    </div>
                  </div>
                )}

              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Kaydediliyor..." : initialData ? "Güncelle" : "Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
