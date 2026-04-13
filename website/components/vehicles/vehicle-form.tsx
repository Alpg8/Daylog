"use client";

import { useEffect } from "react";
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
import type { Vehicle } from "@/types";

const formSchema = z.object({
  plateNumber: z.string().min(1, "Plaka numarası gereklidir"),
  usageType: z.string().optional(),
  ownershipType: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  capacity: z.string().optional(),
  status: z.enum(["AVAILABLE", "ON_ROUTE", "MAINTENANCE", "PASSIVE"]).default("AVAILABLE"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface VehicleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: Vehicle | null;
}

export function VehicleForm({ open, onOpenChange, onSuccess, initialData }: VehicleFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { status: "AVAILABLE" },
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          plateNumber: initialData.plateNumber,
          usageType: initialData.usageType ?? "",
          ownershipType: initialData.ownershipType ?? "",
          brand: initialData.brand ?? "",
          model: initialData.model ?? "",
          capacity: initialData.capacity ?? "",
          status: initialData.status,
          notes: initialData.notes ?? "",
        });
      } else {
        form.reset({ status: "AVAILABLE" });
      }
    }
  }, [open, initialData, form]);

  const onSubmit = async (data: FormData) => {
    const res = await fetch(
      initialData ? `/api/vehicles/${initialData.id}` : "/api/vehicles",
      {
        method: initialData ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error ?? "İşlem başarısız");
      return;
    }
    toast.success(initialData ? "Araç güncellendi" : "Araç eklendi");
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? "Araç Düzenle" : "Yeni Araç"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="plateNumber" render={({ field }) => (
              <FormItem><FormLabel>Plaka *</FormLabel><FormControl><Input placeholder="34 BLJ 541" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="brand" render={({ field }) => (
                <FormItem><FormLabel>Marka</FormLabel><FormControl><Input placeholder="MERCEDES" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem><FormLabel>Model</FormLabel><FormControl><Input placeholder="ACTROS" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="usageType" render={({ field }) => (
                <FormItem><FormLabel>Kullanım Tipi</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YURTICI">Yurtiçi</SelectItem>
                      <SelectItem value="YURTDISI">Yurtdışı</SelectItem>
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ownershipType" render={({ field }) => (
                <FormItem><FormLabel>Mülkiyet</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OZMAL">Özmal</SelectItem>
                      <SelectItem value="KIRALIK">Kiralık</SelectItem>
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Durum *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Müsait</SelectItem>
                      <SelectItem value="ON_ROUTE">Rotada</SelectItem>
                      <SelectItem value="MAINTENANCE">Bakımda</SelectItem>
                      <SelectItem value="PASSIVE">Pasif</SelectItem>
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="capacity" render={({ field }) => (
                <FormItem><FormLabel>Kapasite</FormLabel><FormControl><Input placeholder="24 ton" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notlar</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
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
