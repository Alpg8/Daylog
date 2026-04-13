"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Fuel, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DriverProfile {
  id: string;
  fullName: string;
  assignedVehicleId?: string | null;
  assignedVehicle?: { id: string; plateNumber: string } | null;
}

interface FuelRecordRow {
  id: string;
  date: string;
  liters: number | null;
  totalCost: number | null;
  fuelStation: string | null;
  vehicle?: { plateNumber: string } | null;
}

export function DriverFuelRequestPanel({ appSource = "WEB" }: { appSource?: "WEB" | "APP" }) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [recent, setRecent] = useState<FuelRecordRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [fuelStation, setFuelStation] = useState("");
  const [liters, setLiters] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [startKm, setStartKm] = useState("");
  const [endKm, setEndKm] = useState("");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const distanceKm = useMemo(() => {
    const s = Number(startKm);
    const e = Number(endKm);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return null;
    return e - s;
  }, [startKm, endKm]);

  const fetchData = useCallback(async () => {
    const meRes = await fetch("/api/driver/me", {
      headers: { "x-client-source": appSource },
    });

    if (!meRes.ok) {
      return;
    }

    const meJson = await meRes.json();
    const driver = (meJson?.driver ?? null) as DriverProfile | null;
    setProfile(driver);

    if (driver?.id) {
      const fuelRes = await fetch(`/api/fuel?driverId=${driver.id}&page=1&pageSize=5`, {
        headers: { "x-client-source": appSource },
      });
      if (fuelRes.ok) {
        const fuelJson = await fuelRes.json();
        setRecent((fuelJson.records ?? []) as FuelRecordRow[]);
      }
    }
  }, [appSource]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function submitFuelRequest() {
    if (!profile?.id || !profile?.assignedVehicleId) {
      toast.error("Surucuya atanmis arac bulunamadi.");
      return;
    }

    if (!imageFile) {
      toast.error("Yakit talebi icin fis/fotograf yuklemelisiniz.");
      return;
    }

    const litersNum = Number(liters);
    if (!Number.isFinite(litersNum) || litersNum <= 0) {
      toast.error("Litre degeri pozitif olmalidir.");
      return;
    }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("file", imageFile);
      form.append("date", date);
      form.append("liters", String(litersNum));
      if (fuelStation) form.append("fuelStation", fuelStation);
      if (totalCost) form.append("totalCost", totalCost);
      if (startKm) form.append("startKm", startKm);
      if (endKm) form.append("endKm", endKm);
      if (notes) form.append("notes", notes);

      const res = await fetch("/api/driver/fuel-request", {
        method: "POST",
        headers: { "x-client-source": appSource },
        body: form,
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Yakit talebi kaydedilemedi.");
        return;
      }

      toast.success("Yakit talebi kaydedildi.");
      setFuelStation("");
      setLiters("");
      setTotalCost("");
      setStartKm("");
      setEndKm("");
      setNotes("");
      setImageFile(null);
      fetchData();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Fuel className="h-4 w-4" /> Yakit Talebi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-muted/20 p-2 text-xs text-muted-foreground">
            <p>Surucu: {profile?.fullName ?? "-"}</p>
            <p>
              Arac: {profile?.assignedVehicle?.plateNumber ?? "Atanmamis"}
              {profile?.assignedVehicle?.plateNumber && <Badge variant="outline" className="ml-2">Hazir</Badge>}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Tarih</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Litre *</Label>
              <Input type="number" step="0.01" value={liters} onChange={(e) => setLiters(e.target.value)} className="h-9" placeholder="55" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Istasyon</Label>
              <Input value={fuelStation} onChange={(e) => setFuelStation(e.target.value)} className="h-9" placeholder="Opet / Shell" />
            </div>
            <div>
              <Label className="text-xs">Toplam Tutar</Label>
              <Input type="number" step="0.01" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} className="h-9" placeholder="3000" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Baslangic KM</Label>
              <Input type="number" value={startKm} onChange={(e) => setStartKm(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Bitis KM</Label>
              <Input type="number" value={endKm} onChange={(e) => setEndKm(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Mesafe</Label>
              <Input readOnly value={distanceKm ?? ""} className="h-9 bg-muted" />
            </div>
          </div>

          <div>
            <Label className="text-xs">Not</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[70px] text-sm" placeholder="Yakit durumu / aciklama" />
          </div>

          <div>
            <Label className="text-xs">Fis / Pompa Fotografi *</Label>
            <Input type="file" accept="image/*" capture="environment" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="h-9" />
            {imageFile && <p className="mt-1 text-[11px] text-muted-foreground">Secilen: {imageFile.name}</p>}
          </div>

          <Button className="w-full" onClick={submitFuelRequest} disabled={submitting || !profile?.assignedVehicleId}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kaydediliyor...</> : "Yakit Talebi Gonder"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Son 5 Yakit Kaydi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 && <p className="text-sm text-muted-foreground">Kayit bulunamadi.</p>}
          {recent.map((row) => (
            <div key={row.id} className="rounded-lg border p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">{new Date(row.date).toLocaleDateString("tr-TR")}</span>
                <Badge variant="outline">{row.vehicle?.plateNumber ?? "-"}</Badge>
              </div>
              <p className="text-muted-foreground">{row.fuelStation || "Istasyon belirtilmedi"}</p>
              <p>{row.liters ?? 0} L / {row.totalCost ?? 0} TRY</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
