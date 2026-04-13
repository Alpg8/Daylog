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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Driver, User, Vehicle } from "@/types";

const formSchema = z.object({
  userId: z.string().optional(),
  fullName: z.string().min(1, "Ad Soyad gereklidir"),
  phoneNumber: z.string().optional(),
  nationalId: z.string().optional(),
  passportExpiryDate: z.string().optional(),
  licenseExpiryDate: z.string().optional(),
  psychotechnicExpiryDate: z.string().optional(),
  assignedVehicleId: z.string().optional(),
  usageType: z.enum(["YURTICI", "YURTDISI"]).optional(),
  ownershipType: z.enum(["OZMAL", "KIRALIK"]).optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DriverFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: Driver | null;
}

const fmt = (d: Date | null | undefined) => d ? new Date(d).toISOString().split("T")[0] : "";

export function DriverForm({ open, onOpenChange, onSuccess, initialData }: DriverFormProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<Array<Pick<User, "id" | "name" | "email" | "role" | "isActive">>>([]);
  const form = useForm<FormData>({ resolver: zodResolver(formSchema), defaultValues: { isActive: true } });

  const fetchVehicles = useCallback(async () => {
    const res = await fetch("/api/vehicles");
    if (res.ok) { const j = await res.json(); setVehicles(j.vehicles ?? []); }
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) {
      const j = await res.json();
      const allUsers = (j.users ?? []) as Array<Pick<User, "id" | "name" | "email" | "role" | "isActive">>;
      setUsers(allUsers.filter((u) => u.role === "DRIVER" && u.isActive));
    }
  }, []);

  useEffect(() => { fetchVehicles(); fetchUsers(); }, [fetchVehicles, fetchUsers]);

  useEffect(() => {
    if (open) {
      form.reset(initialData ? {
        userId: initialData.userId ?? undefined,
        fullName: initialData.fullName,
        phoneNumber: initialData.phoneNumber ?? "",
        nationalId: initialData.nationalId ?? "",
        passportExpiryDate: fmt(initialData.passportExpiryDate),
        licenseExpiryDate: fmt(initialData.licenseExpiryDate),
        psychotechnicExpiryDate: fmt(initialData.psychotechnicExpiryDate),
        assignedVehicleId: initialData.assignedVehicleId ?? undefined,
        usageType: (initialData.usageType as "YURTICI" | "YURTDISI") ?? undefined,
        ownershipType: (initialData.ownershipType as "OZMAL" | "KIRALIK") ?? undefined,
        isActive: initialData.isActive ?? true,
        notes: initialData.notes ?? "",
      } : { isActive: true });
    }
  }, [open, initialData, form]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      userId: (!data.userId || data.userId === "__none__") ? null : data.userId,
      assignedVehicleId: (!data.assignedVehicleId || data.assignedVehicleId === "__none__") ? null : data.assignedVehicleId,
      usageType: (!data.usageType || (data.usageType as string) === "__none__") ? undefined : data.usageType,
      ownershipType: (!data.ownershipType || (data.ownershipType as string) === "__none__") ? undefined : data.ownershipType,
      passportExpiryDate: data.passportExpiryDate || null,
      licenseExpiryDate: data.licenseExpiryDate || null,
      psychotechnicExpiryDate: data.psychotechnicExpiryDate || null,
    };
    const res = await fetch(initialData ? `/api/drivers/${initialData.id}` : "/api/drivers", {
      method: initialData ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const e = await res.json(); toast.error(e.error ?? "Hata"); return; }
    toast.success(initialData ? "Sürücü güncellendi" : "Sürücü eklendi");
    onSuccess(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{initialData ? "Sürücü Düzenle" : "Yeni Sürücü"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>Ad Soyad *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="userId" render={({ field }) => (
                  <FormItem><FormLabel>App Kullanici Hesabi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <SelectTrigger><SelectValue placeholder="Sofor kullanicisi secin..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Baglama —</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name} — {u.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">Mobil app girisi bu kullanici ile yapilir.</p>
                    <p className="text-[11px] text-muted-foreground">Hesap yoksa once Kullanicilar ekranindan rolu "Surucu" olan yeni kullanici olusturun, sonra burada baglayin.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>Telefon</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="nationalId" render={({ field }) => (
                    <FormItem><FormLabel>TC Kimlik</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <FormField control={form.control} name="passportExpiryDate" render={({ field }) => (
                    <FormItem><FormLabel>Pasaport Bitiş</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="licenseExpiryDate" render={({ field }) => (
                    <FormItem><FormLabel>Ehliyet Bitiş</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="psychotechnicExpiryDate" render={({ field }) => (
                    <FormItem><FormLabel>Psikoteknik Bitiş</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="assignedVehicleId" render={({ field }) => (
                  <FormItem><FormLabel>Araç</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <SelectTrigger><SelectValue placeholder="Araç seçin..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Yok —</SelectItem>
                        {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.plateNumber} — {v.brand} {v.model}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="usageType" render={({ field }) => (
                    <FormItem><FormLabel>Kullanım Türü</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Yok —</SelectItem>
                          <SelectItem value="YURTICI">Yurt İçi</SelectItem>
                          <SelectItem value="YURTDISI">Yurt Dışı</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="ownershipType" render={({ field }) => (
                    <FormItem><FormLabel>Mülkiyet Türü</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <SelectTrigger><SelectValue placeholder="Seçin..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Yok —</SelectItem>
                          <SelectItem value="OZMAL">Özmal</SelectItem>
                          <SelectItem value="KIRALIK">Kiralık</SelectItem>
                        </SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <FormLabel className="cursor-pointer">Aktif</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notlar</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
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
