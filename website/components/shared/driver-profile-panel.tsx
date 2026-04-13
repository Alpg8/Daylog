"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, UserCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DriverProfile {
  id: string;
  fullName: string;
  phoneNumber?: string | null;
  notes?: string | null;
  assignedVehicle?: { plateNumber: string } | null;
}

export function DriverProfilePanel({ appSource = "APP" }: { appSource?: "APP" | "WEB" }) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/driver/me", {
      headers: { "x-client-source": appSource },
    });

    if (!res.ok) return;

    const data = await res.json();
    const driver = (data.driver ?? null) as DriverProfile | null;
    setProfile(driver);
    setPhoneNumber(driver?.phoneNumber ?? "");
    setNotes(driver?.notes ?? "");
  }, [appSource]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function saveProfile() {
    if (!profile?.id) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/drivers/${profile.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-client-source": appSource,
        },
        body: JSON.stringify({ phoneNumber, notes }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Profil guncellenemedi");
        return;
      }

      toast.success("Profil guncellendi");
      fetchProfile();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCircle2 className="h-4 w-4" /> Surucu Profili
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-muted/20 p-2.5 text-xs">
            <p className="font-medium">{profile?.fullName ?? "-"}</p>
            <p className="text-muted-foreground">Arac: {profile?.assignedVehicle?.plateNumber ?? "Atanmamis"}</p>
            <Badge variant="outline" className="mt-1">Sadece kendi bilgilerinizi duzenleyebilirsiniz</Badge>
          </div>

          <div>
            <Label className="text-xs">Telefon</Label>
            <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-9" />
          </div>

          <div>
            <Label className="text-xs">Not</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[90px] text-sm" />
          </div>

          <Button onClick={saveProfile} disabled={saving || !profile?.id} className="w-full">
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Kaydediliyor...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Bilgileri Kaydet</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
