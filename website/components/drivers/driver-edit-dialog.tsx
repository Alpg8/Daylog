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

interface DriverEditDialogProps {
  driver: {
    id: string;
    fullName: string;
    phoneNumber: string | null;
    nationalId: string | null;
    usageType: string | null;
    ownershipType: string | null;
    isActive: boolean;
    passportExpiryDate: Date | null;
    licenseExpiryDate: Date | null;
    psychotechnicExpiryDate: Date | null;
  };
}

function toDateInput(value: Date | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

export function DriverEditDialog({ driver }: DriverEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: driver.fullName,
    phoneNumber: driver.phoneNumber ?? "",
    nationalId: driver.nationalId ?? "",
    usageType: driver.usageType ?? "",
    ownershipType: driver.ownershipType ?? "",
    isActive: driver.isActive,
    passportExpiryDate: toDateInput(driver.passportExpiryDate),
    licenseExpiryDate: toDateInput(driver.licenseExpiryDate),
    psychotechnicExpiryDate: toDateInput(driver.psychotechnicExpiryDate),
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
        const res = await fetch(`/api/drivers/${driver.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            passportExpiryDate: form.passportExpiryDate || null,
            licenseExpiryDate: form.licenseExpiryDate || null,
            psychotechnicExpiryDate: form.psychotechnicExpiryDate || null,
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
          <DialogTitle>Sürücü Bilgilerini Düzenle</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Ad Soyad *</Label>
            <Input {...field("fullName")} required placeholder="Ad Soyad" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input {...field("phoneNumber")} placeholder="+90 5xx xxx xx xx" />
            </div>
            <div className="space-y-1.5">
              <Label>TC Kimlik No</Label>
              <Input {...field("nationalId")} placeholder="11 haneli TC" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kullanım Tipi</Label>
              <Select
                value={form.usageType}
                onValueChange={(v) => setForm((prev) => ({ ...prev, usageType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YURTICI">Yurt İçi</SelectItem>
                  <SelectItem value="YURTDISI">Yurt Dışı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mülkiyet Tipi</Label>
              <Select
                value={form.ownershipType}
                onValueChange={(v) => setForm((prev) => ({ ...prev, ownershipType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OZMAL">Öz Mal</SelectItem>
                  <SelectItem value="KIRALIK">Kiralık</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Durum</Label>
            <Select
              value={form.isActive ? "true" : "false"}
              onValueChange={(v) => setForm((prev) => ({ ...prev, isActive: v === "true" }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Pasif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              SKT Tarihleri
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Pasaport SKT</Label>
                <Input type="date" {...field("passportExpiryDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>Ehliyet SKT</Label>
                <Input type="date" {...field("licenseExpiryDate")} />
              </div>
              <div className="space-y-1.5">
                <Label>Psikoteknik SKT</Label>
                <Input type="date" {...field("psychotechnicExpiryDate")} />
              </div>
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
