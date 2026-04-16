"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VehicleEditDialogProps {
  vehicle: {
    id: string;
    plateNumber: string;
    brand: string | null;
    model: string | null;
    capacity: string | null;
    usageType: string | null;
    ownershipType: string | null;
    status: string;
    maintenanceExpiry: Date | null;
  };
}

function toDateInput(value: Date | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

export function VehicleEditDialog({ vehicle }: VehicleEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    plateNumber: vehicle.plateNumber,
    brand: vehicle.brand ?? "",
    model: vehicle.model ?? "",
    capacity: vehicle.capacity ?? "",
    usageType: vehicle.usageType ?? "",
    ownershipType: vehicle.ownershipType ?? "",
    status: vehicle.status,
    maintenanceExpiry: toDateInput(vehicle.maintenanceExpiry),
  });

  function field(name: keyof typeof form) {
    return {
      value: form[name] as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [name]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/vehicles/${vehicle.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            maintenanceExpiry: form.maintenanceExpiry || null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Kayıt başarısız.");
          return;
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Sunucuya bağlanılamadı.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Pencil className="h-4 w-4" />
          Düzenle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Araç Bilgilerini Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Plaka *</Label>
            <Input {...field("plateNumber")} required placeholder="34 XX 0000" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Marka</Label>
              <Input {...field("brand")} placeholder="Mercedes, Volvo…" />
            </div>
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Input {...field("model")} placeholder="Actros, FH16…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Kapasite</Label>
            <Input {...field("capacity")} placeholder="24000 kg" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kullanım Tipi</Label>
              <Select
                value={form.usageType}
                onValueChange={(v) => setForm((prev) => ({ ...prev, usageType: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YURTICI">Yurt İçi</SelectItem>
                  <SelectItem value="YURTDISI">Yurt Dışı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mülkiyet</Label>
              <Select
                value={form.ownershipType}
                onValueChange={(v) => setForm((prev) => ({ ...prev, ownershipType: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Seçiniz" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OZMAL">Öz Mal</SelectItem>
                  <SelectItem value="KIRALIK">Kiralık</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Durum</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Müsait</SelectItem>
                  <SelectItem value="ON_ROUTE">Yolda</SelectItem>
                  <SelectItem value="MAINTENANCE">Bakımda</SelectItem>
                  <SelectItem value="PASSIVE">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Muayene / Bakım SKT</Label>
              <Input type="date" {...field("maintenanceExpiry")} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
