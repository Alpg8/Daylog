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
import type { Trailer } from "@/types";

const formSchema = z.object({
  plateNumber: z.string().min(1, "Plaka gereklidir"),
  type: z.string().optional(),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "SOLD"]).default("AVAILABLE"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TrailerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: Trailer | null;
}

export function TrailerForm({ open, onOpenChange, onSuccess, initialData }: TrailerFormProps) {
  const form = useForm<FormData>({ resolver: zodResolver(formSchema), defaultValues: { status: "AVAILABLE" } });

  useEffect(() => {
    if (open) {
      form.reset(initialData ? {
        plateNumber: initialData.plateNumber,
        type: initialData.type ?? "",
        status: initialData.status,
        notes: initialData.notes ?? "",
      } : { status: "AVAILABLE" });
    }
  }, [open, initialData, form]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      plateNumber: data.plateNumber.trim(),
      status: data.status,
      type: data.type?.trim() || null,
      notes: data.notes?.trim() || null,
    };

    const res = await fetch(initialData ? `/api/trailers/${initialData.id}` : "/api/trailers", {
      method: initialData ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const e = await res.json(); toast.error(e.error ?? "Hata"); return; }
    toast.success(initialData ? "Dorse güncellendi" : "Dorse eklendi");
    onSuccess(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" disableAutoFocus>
        <DialogHeader><DialogTitle>{initialData ? "Dorse Düzenle" : "Yeni Dorse"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="plateNumber" render={({ field }) => (
              <FormItem><FormLabel>Plaka *</FormLabel><FormControl><Input placeholder="34 TY 4259" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Tip</FormLabel><FormControl><Input placeholder="TENTELI, FRİGORİFİK..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Durum *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Müsait</SelectItem>
                      <SelectItem value="IN_USE">Kullanımda</SelectItem>
                      <SelectItem value="MAINTENANCE">Bakımda</SelectItem>
                      <SelectItem value="SOLD">Satıldı</SelectItem>
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
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
