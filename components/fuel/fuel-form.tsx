"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FuelRecord, Vehicle, Driver } from "@/types";

const formSchema = z.object({
  vehicleId: z.string().min(1, "Araç gereklidir"),
  driverId: z.string().optional(),
  date: z.string().min(1, "Tarih gereklidir"),
  fuelStation: z.string().optional(),
  liters: z.coerce.number().positive("Pozitif değer girin"),
  pricePerLiter: z.coerce.number().optional(),
  totalCost: z.coerce.number().optional(),
  startKm: z.coerce.number().optional(),
  endKm: z.coerce.number().optional(),
  fuelType: z.string().optional(),
  paymentMethod: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FuelFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: FuelRecord | null;
}

const fmt = (d: Date | null | undefined) => d ? new Date(d).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

export function FuelForm({ open, onOpenChange, onSuccess, initialData }: FuelFormProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const form = useForm<FormData>({ resolver: zodResolver(formSchema), defaultValues: { date: new Date().toISOString().split("T")[0], liters: 0 } });

  const watchStart = form.watch("startKm");
  const watchEnd = form.watch("endKm");
  const distanceKm = watchStart && watchEnd && watchEnd > watchStart ? watchEnd - watchStart : null;

  const fetchRefs = useCallback(async () => {
    const [vr, dr] = await Promise.all([fetch("/api/vehicles"), fetch("/api/drivers")]);
    if (vr.ok) { const j = await vr.json(); setVehicles(j.vehicles ?? []); }
    if (dr.ok) { const j = await dr.json(); setDrivers(j.drivers ?? []); }
  }, []);

  useEffect(() => { fetchRefs(); }, [fetchRefs]);

  useEffect(() => {
    if (open) {
      form.reset(initialData ? {
        vehicleId: initialData.vehicleId,
        driverId: initialData.driverId ?? undefined,
        date: fmt(initialData.date),
        fuelStation: initialData.fuelStation ?? "",
        liters: initialData.liters ?? 0,
        pricePerLiter: initialData.pricePerLiter ?? undefined,
        totalCost: initialData.totalCost ?? undefined,
        startKm: initialData.startKm ?? undefined,
        endKm: initialData.endKm ?? undefined,
        fuelType: initialData.fuelType ?? "",
        paymentMethod: initialData.paymentMethod ?? "",
        country: initialData.country ?? "",
        city: initialData.city ?? "",
        currency: initialData.currency ?? "",
        notes: initialData.notes ?? "",
      } : { date: new Date().toISOString().split("T")[0], liters: 0 });
    }
  }, [open, initialData, form]);

  const onSubmit = async (data: FormData) => {
    const payload = { ...data, driverId: (!data.driverId || data.driverId === "__none__") ? null : data.driverId };
    const res = await fetch(initialData ? `/api/fuel/${initialData.id}` : "/api/fuel", {
      method: initialData ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const e = await res.json(); toast.error(e.error ?? "Hata"); return; }
    toast.success(initialData ? "Yakıt kaydı güncellendi" : "Yakıt kaydı eklendi");
    onSuccess(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initialData ? "Yakıt Kaydı Düzenle" : "Yeni Yakıt Kaydı"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="vehicleId" render={({ field }) => (
                    <FormItem><FormLabel>Araç *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger><SelectValue placeholder="Araç seçin..." /></SelectTrigger>
                        <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plateNumber}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="driverId" render={({ field }) => (
                    <FormItem><FormLabel>Sürücü</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger><SelectValue placeholder="Sürücü seçin..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Yok —</SelectItem>
                          {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>)}
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem><FormLabel>Tarih *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="fuelStation" render={({ field }) => (
                    <FormItem><FormLabel>İstasyon</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="liters" render={({ field }) => (
                    <FormItem><FormLabel>Litre *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="pricePerLiter" render={({ field }) => (
                    <FormItem><FormLabel>Fiyat/L</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="totalCost" render={({ field }) => (
                    <FormItem><FormLabel>Toplam Maliyet</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="startKm" render={({ field }) => (
                    <FormItem><FormLabel>Başlangıç KM</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="endKm" render={({ field }) => (
                    <FormItem><FormLabel>Bitiş KM</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormItem>
                    <FormLabel>Mesafe KM</FormLabel>
                    <Input readOnly value={distanceKm ?? ""} className="bg-muted" />
                  </FormItem>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="fuelType" render={({ field }) => (
                    <FormItem><FormLabel>Yakıt Türü</FormLabel><FormControl><Input placeholder="Motorin, Benzin..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                    <FormItem><FormLabel>Ödeme Yöntemi</FormLabel><FormControl><Input placeholder="Nakit, Kart..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem><FormLabel>Ülke</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>Şehir</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem><FormLabel>Para Birimi</FormLabel><FormControl><Input placeholder="TRY, EUR..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notlar</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Kaydediliyor..." : initialData ? "Güncelle" : "Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
