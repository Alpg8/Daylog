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

const formSchema = z.object({
  orderCategory: z.enum(["DOMESTIC", "IMPORT", "EXPORT"]),
  tradeType: z.enum(["ITH", "IHR", ""]).optional(),
  positionNumber: z.string().optional(),
  loadingDate: z.string().optional(),
  unloadingDate: z.string().optional(),
  operationDate: z.string().optional(),
  pickupLocation: z.string().optional(),
  companyName: z.string().optional(),
  customerName: z.string().optional(),
  referenceNumber: z.string().optional(),
  transportType: z.string().optional(),
  cargoNumber: z.string().optional(),
  tripNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  routeText: z.string().optional(),
  cmrStatus: z.string().optional(),
  documentStatus: z.string().optional(),
  vehicleId: z.string().optional(),
  trailerId: z.string().optional(),
  driverId: z.string().optional(),
  status: z.enum(["PENDING", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  notes: z.string().optional(),
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
    defaultValues: {
      orderCategory: defaultCategory,
      status: "PENDING",
    },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          orderCategory: initialData.orderCategory,
          tradeType: (initialData.tradeType as "" | "ITH" | "IHR" | undefined) ?? "",
          positionNumber: initialData.positionNumber ?? "",
          loadingDate: initialData.loadingDate ? new Date(initialData.loadingDate).toISOString().split("T")[0] : "",
          unloadingDate: initialData.unloadingDate ? new Date(initialData.unloadingDate).toISOString().split("T")[0] : "",
          operationDate: initialData.operationDate ? new Date(initialData.operationDate).toISOString().split("T")[0] : "",
          pickupLocation: initialData.pickupLocation ?? "",
          companyName: initialData.companyName ?? "",
          customerName: initialData.customerName ?? "",
          referenceNumber: initialData.referenceNumber ?? "",
          transportType: initialData.transportType ?? "",
          cargoNumber: initialData.cargoNumber ?? "",
          tripNumber: initialData.tripNumber ?? "",
          invoiceNumber: initialData.invoiceNumber ?? "",
          routeText: initialData.routeText ?? "",
          cmrStatus: initialData.cmrStatus ?? "",
          documentStatus: initialData.documentStatus ?? "",
          vehicleId: initialData.vehicleId ?? "",
          trailerId: initialData.trailerId ?? "",
          driverId: initialData.driverId ?? "",
          status: initialData.status,
          notes: initialData.notes ?? "",
        });
      } else {
        form.reset({ orderCategory: defaultCategory, status: "PENDING" });
      }
    }
  }, [open, initialData, defaultCategory, form]);

  const onSubmit = async (data: FormData) => {
    try {
      const cleanData = {
        ...data,
        tradeType: data.tradeType || null,
        loadingDate: data.loadingDate || null,
        unloadingDate: data.unloadingDate || null,
        operationDate: data.operationDate || null,
        vehicleId: (!data.vehicleId || data.vehicleId === "__none__") ? null : data.vehicleId,
        trailerId: (!data.trailerId || data.trailerId === "__none__") ? null : data.trailerId,
        driverId: (!data.driverId || data.driverId === "__none__") ? null : data.driverId,
      };

      const res = await fetch(
        initialData ? `/api/orders/${initialData.id}` : "/api/orders",
        {
          method: initialData ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanData),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "İşlem başarısız");
        return;
      }

      toast.success(initialData ? "Sipariş güncellendi" : "Sipariş oluşturuldu");
      onSuccess();
      onOpenChange(false);
    } catch {
      toast.error("Bir hata oluştu");
    }
  };

  const category = form.watch("orderCategory");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? "Sipariş Düzenle" : "Yeni Sipariş"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="grid grid-cols-2 gap-4 pb-4">
                {/* Category */}
                <FormField
                  control={form.control}
                  name="orderCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DOMESTIC">Yurtiçi</SelectItem>
                            <SelectItem value="IMPORT">İthalat</SelectItem>
                            <SelectItem value="EXPORT">İhracat</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durum *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
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
                  )}
                />

                {/* TradeType */}
                {(category === "IMPORT" || category === "EXPORT") && (
                  <FormField
                    control={form.control}
                    name="tradeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticaret Tipi</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} value={field.value ?? ""}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ITH">İthalat (ITH)</SelectItem>
                              <SelectItem value="IHR">İhracat (IHR)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Customer Name */}
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Müşteri</FormLabel>
                      <FormControl>
                        <Input placeholder="Müşteri adı" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Company Name */}
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firma</FormLabel>
                      <FormControl>
                        <Input placeholder="Firma adı" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reference Number */}
                <FormField
                  control={form.control}
                  name="referenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>REF No</FormLabel>
                      <FormControl>
                        <Input placeholder="Referans numarası" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cargo Number */}
                <FormField
                  control={form.control}
                  name="cargoNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yük Numarası</FormLabel>
                      <FormControl>
                        <Input placeholder="DAY2600001EX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Trip Number */}
                <FormField
                  control={form.control}
                  name="tripNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sefer No</FormLabel>
                      <FormControl>
                        <Input placeholder="DAY26OZ0001EX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Invoice Number */}
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fatura No</FormLabel>
                      <FormControl>
                        <Input placeholder="LOG2026000001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Loading Date */}
                <FormField
                  control={form.control}
                  name="loadingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Yükleme Tarihi</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Unloading Date */}
                <FormField
                  control={form.control}
                  name="unloadingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Boşaltma Tarihi</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Operation Date */}
                <FormField
                  control={form.control}
                  name="operationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operasyon Tarihi</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vehicle */}
                <FormField
                  control={form.control}
                  name="vehicleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Araç (Çekici)</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="Araç seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Seçilmedi</SelectItem>
                            {vehicles.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.plateNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Trailer */}
                <FormField
                  control={form.control}
                  name="trailerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dorse</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="Dorse seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Seçilmedi</SelectItem>
                            {trailers.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.plateNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Driver */}
                <FormField
                  control={form.control}
                  name="driverId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sürücü</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value ?? ""}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sürücü seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Seçilmedi</SelectItem>
                            {drivers.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Transport Type */}
                <FormField
                  control={form.control}
                  name="transportType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taşıma Tipi</FormLabel>
                      <FormControl>
                        <Input placeholder="IHRACAT, DAĞİTIM..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Route */}
                <FormField
                  control={form.control}
                  name="routeText"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Güzergah</FormLabel>
                      <FormControl>
                        <Input placeholder="TR-BG-RO-HU-AT-DE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pickup Location */}
                <FormField
                  control={form.control}
                  name="pickupLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alış Noktası</FormLabel>
                      <FormControl>
                        <Input placeholder="PENDIK" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Position Number */}
                <FormField
                  control={form.control}
                  name="positionNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pozisyon No</FormLabel>
                      <FormControl>
                        <Input placeholder="01/24/0001-Y" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* CMR Status */}
                <FormField
                  control={form.control}
                  name="cmrStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CMR Durumu</FormLabel>
                      <FormControl>
                        <Input placeholder="EKLENDI-ORJ GELDI" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Document Status */}
                <FormField
                  control={form.control}
                  name="documentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Evrak Durumu</FormLabel>
                      <FormControl>
                        <Input placeholder="Evrak durumu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <div className="col-span-2">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notlar</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Ek açıklamalar..." rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                İptal
              </Button>
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
