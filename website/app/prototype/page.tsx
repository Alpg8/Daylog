import { Bell, Camera, CheckCircle2, Fuel, MapPin, Truck, UserCircle2 } from "lucide-react";

function PhoneFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-[290px] rounded-[2.2rem] border border-slate-800 bg-slate-950 p-2 shadow-2xl shadow-slate-900/40">
      <div className="relative overflow-hidden rounded-[1.8rem] bg-gradient-to-b from-slate-100 to-white">
        <div className="mx-auto mt-2 h-1.5 w-20 rounded-full bg-slate-300" />
        <div className="px-4 pb-5 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Daylog Driver</p>
          <p className="mt-0.5 text-sm font-bold text-slate-900">{title}</p>
        </div>
        <div className="px-3 pb-4">{children}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

export default function AppStorePrototypePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_10%,#fef3c7_0%,#fff7ed_28%,#eff6ff_62%,#eef2ff_100%)] p-6 md:p-10">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">App Store + Google Play Prototype</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">Daylog Driver Mobile</h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
            Sofor odakli mobil deneyim: kendi isi ve araci, asama bildirimi, zorunlu gorsel yukleme,
            yakit talebi ve bildirim takibi.
          </p>
        </div>

        <div className="mb-7 grid gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur md:grid-cols-4">
          <Stat label="Kullanici Tipi" value="Sofor" />
          <Stat label="Gorsel Zorunlu" value="Evet" />
          <Stat label="Yakıt Talebi" value="Aktif" />
          <Stat label="Takip" value="Canli" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <PhoneFrame title="Ana Panel">
            <div className="space-y-2.5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Aktif Is</p>
                <p className="text-sm font-semibold text-emerald-900">Yuk: DK-2481 / Sefer: TR-441</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-800"><Truck className="h-3 w-3" />34 ABC 123</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-emerald-800"><MapPin className="h-3 w-3" />Gebze {"->"} Ankara</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <button className="rounded-lg border bg-white p-2 text-left"><Bell className="mb-1 h-3.5 w-3.5" />Bildirimler</button>
                <button className="rounded-lg border bg-white p-2 text-left"><Fuel className="mb-1 h-3.5 w-3.5" />Yakit Talebi</button>
                <button className="rounded-lg border bg-white p-2 text-left"><Camera className="mb-1 h-3.5 w-3.5" />Foto Yukle</button>
                <button className="rounded-lg border bg-white p-2 text-left"><CheckCircle2 className="mb-1 h-3.5 w-3.5" />Isi Tamamla</button>
              </div>
            </div>
          </PhoneFrame>

          <PhoneFrame title="Is Asama Akisi">
            <div className="space-y-2 text-xs">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                <p className="font-semibold text-blue-900">1. Isi Baslat</p>
                <p className="text-blue-700">Event + fotograf + onam</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <p className="font-semibold text-amber-900">2. Yukleme</p>
                <p className="text-amber-700">Asama bildirimi + kanit gorseli</p>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-2.5">
                <p className="font-semibold text-violet-900">3. Teslim</p>
                <p className="text-violet-700">Teslim onayi + fotograf</p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
                <p className="font-semibold text-emerald-900">4. Isi Bitir</p>
                <p className="text-emerald-700">Kapanis + son gorsel</p>
              </div>
            </div>
          </PhoneFrame>

          <PhoneFrame title="Yakit + Profil">
            <div className="space-y-2.5 text-xs">
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <p className="font-semibold text-slate-900">Yakit Talebi</p>
                <p className="mt-0.5 text-slate-600">Litre, tutar, km ve fis fotografi zorunlu</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                <p className="font-semibold text-slate-900">Sofor Profili</p>
                <p className="mt-0.5 text-slate-600">Sadece kendi telefon ve not bilgisi guncellenir</p>
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[10px]"><UserCircle2 className="h-3 w-3" />Yetki: Kendi Kaydi</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-800">
                App sadece sofor ekranidir.
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-2.5 text-indigo-800">
                Web paneli tum isler + yonetim + takip ekranidir.
              </div>
            </div>
          </PhoneFrame>
        </div>
      </section>
    </main>
  );
}
