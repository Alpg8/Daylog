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
import { Checkbox } from "@/components/ui/checkbox";
import type { User } from "@/types";

const createSchema = z.object({
  name: z.string().min(1, "Ad gereklidir"),
  email: z.string().email("Geçerli e-posta girin"),
  password: z.string().min(8, "En az 8 karakter"),
  role: z.enum(["ADMIN", "DISPATCHER", "DRIVER"]).default("DISPATCHER"),
  isActive: z.boolean().default(true),
});

const editSchema = z.object({
  name: z.string().min(1, "Ad gereklidir"),
  email: z.string().email("Geçerli e-posta girin"),
  password: z.string().optional(),
  role: z.enum(["ADMIN", "DISPATCHER", "DRIVER"]).default("DISPATCHER"),
  isActive: z.boolean().default(true),
});

type CreateData = z.infer<typeof createSchema>;
type EditData = z.infer<typeof editSchema>;
type FormData = CreateData | EditData;

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialData?: User | null;
}

export function UserForm({ open, onOpenChange, onSuccess, initialData }: UserFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(initialData ? editSchema : createSchema),
    defaultValues: { role: "DISPATCHER", isActive: true },
  });

  useEffect(() => {
    if (open) {
      form.reset(initialData ? {
        name: initialData.name,
        email: initialData.email,
        password: "",
        role: initialData.role,
        isActive: initialData.isActive ?? true,
      } : { role: "DISPATCHER", isActive: true });
    }
  }, [open, initialData, form]);

  const onSubmit = async (data: FormData) => {
    const payload: Record<string, unknown> = { name: data.name, email: data.email, role: data.role, isActive: (data as EditData).isActive };
    if ("password" in data && data.password) payload.password = data.password;
    const res = await fetch(initialData ? `/api/users/${initialData.id}` : "/api/users", {
      method: initialData ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { const e = await res.json(); toast.error(e.error ?? "Hata"); return; }
    toast.success(initialData ? "Kullanıcı güncellendi" : "Kullanıcı eklendi");
    onSuccess(); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{initialData ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Ad Soyad *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>E-posta *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>{initialData ? "Yeni Şifre (boş bırakılırsa değişmez)" : "Şifre *"}</FormLabel>
                <FormControl><Input type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>Rol *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="DISPATCHER">Dispeçer</SelectItem>
                      <SelectItem value="DRIVER">Sürücü</SelectItem>
                    </SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-end gap-2 pb-2">
                  <FormControl><Checkbox checked={field.value as boolean} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="cursor-pointer">Aktif</FormLabel>
                </FormItem>
              )} />
            </div>
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
