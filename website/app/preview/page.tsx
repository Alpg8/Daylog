import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, UserCircle2, MapPin, Fuel, CheckCircle2 } from "lucide-react";

export default function PreviewPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-amber-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Daylog Driver Preview</Badge>
          <Button variant="outline">Canli Takip</Button>
        </div>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-sky-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Surucu Paneli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <UserCircle2 className="h-5 w-5 text-sky-700" />
                  <p className="font-semibold">Mehmet Kaya</p>
                  <Badge variant="outline" className="ml-auto">Aktif Vardiya</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-1"><Truck className="h-4 w-4" /> 34 ABC 123</p>
                  <p className="flex items-center gap-1"><MapPin className="h-4 w-4" /> Gebze {"->"} Ankara</p>
                  <p className="flex items-center gap-1"><Fuel className="h-4 w-4" /> Yakit: %68</p>
                  <p className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Durum: Yolda</p>
                </div>
              </div>

              <div className="rounded-xl border bg-sky-50 p-4">
                <p className="text-sm font-medium text-sky-800">Siradaki Gorev</p>
                <p className="mt-1 text-sm text-sky-900">Yukleme tamamla ve teslim fotografini yukle.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-amber-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Trucker + Truck</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border bg-gradient-to-br from-amber-100 via-orange-50 to-sky-100 p-6">
                <svg viewBox="0 0 620 320" className="h-auto w-full" role="img" aria-label="A trucker standing near a truck">
                  <rect x="42" y="206" width="534" height="10" rx="5" fill="#9CA3AF" opacity="0.4" />

                  <rect x="180" y="118" width="280" height="84" rx="12" fill="#2563EB" />
                  <rect x="458" y="138" width="84" height="64" rx="10" fill="#1D4ED8" />
                  <rect x="468" y="146" width="48" height="24" rx="4" fill="#BFDBFE" />
                  <rect x="208" y="134" width="222" height="48" rx="8" fill="#60A5FA" />
                  <rect x="182" y="110" width="278" height="12" rx="5" fill="#1E40AF" />

                  <circle cx="240" cy="214" r="28" fill="#111827" />
                  <circle cx="240" cy="214" r="14" fill="#E5E7EB" />
                  <circle cx="494" cy="214" r="28" fill="#111827" />
                  <circle cx="494" cy="214" r="14" fill="#E5E7EB" />

                  <circle cx="88" cy="88" r="16" fill="#F59E0B" />
                  <rect x="74" y="104" width="28" height="40" rx="8" fill="#B45309" />
                  <rect x="58" y="118" width="16" height="12" rx="4" fill="#78350F" />
                  <rect x="102" y="118" width="16" height="12" rx="4" fill="#78350F" />
                  <rect x="72" y="142" width="12" height="34" rx="5" fill="#1F2937" />
                  <rect x="92" y="142" width="12" height="34" rx="5" fill="#1F2937" />
                  <rect x="70" y="174" width="14" height="8" rx="2" fill="#111827" />
                  <rect x="92" y="174" width="14" height="8" rx="2" fill="#111827" />
                </svg>
                <p className="mt-3 text-sm text-muted-foreground">Operasyon ekraninda surucu ve arac durumu birlikte gorunur.</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
