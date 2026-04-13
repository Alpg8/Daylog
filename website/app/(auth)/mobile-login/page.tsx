"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Smartphone, Truck, UserCircle2 } from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("Gecerli e-posta girin"),
  password: z.string().min(1, "Sifre gereklidir"),
});

type FormData = z.infer<typeof schema>;

export default function MobileLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const e = await res.json();
      setError(e.error ?? "Giris basarisiz");
      return;
    }

    const payload = await res.json();
    if (payload?.user?.role !== "DRIVER") {
      setError("Bu giris yalnizca sofor kullanicilari icindir");
      return;
    }

    toast.success("Mobil giris basarili");
    router.push("/app");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 px-4 py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-2 md:items-center">
        <div className="glass-strong glass-highlight relative w-full rounded-3xl p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-600 shadow-2xl shadow-emerald-500/30">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Daylog Mobile App</h1>
            <p className="mt-1 text-sm text-white/40">Sofor Girisi</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/60 text-xs font-semibold uppercase tracking-wider">E-posta</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="driver@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/60 text-xs font-semibold uppercase tracking-wider">Sifre</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <Button type="submit" className="mt-2 w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Giris yapiliyor...</>
                ) : "Mobil Giris Yap"}
              </Button>

              <p className="text-center text-xs text-white/50">
                Web yonetim icin <Link href="/login" className="text-blue-300 underline">web giris ekranina</Link> gidin.
              </p>

              <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-white/60">
                <div className="rounded-lg border border-white/10 px-2 py-2 text-center">
                  <Truck className="mx-auto mb-1 h-3.5 w-3.5" />
                  Islerim
                </div>
                <div className="rounded-lg border border-white/10 px-2 py-2 text-center">
                  <UserCircle2 className="mx-auto mb-1 h-3.5 w-3.5" />
                  Sofor
                </div>
                <div className="rounded-lg border border-white/10 px-2 py-2 text-center">
                  <Smartphone className="mx-auto mb-1 h-3.5 w-3.5" />
                  Mobil
                </div>
              </div>
            </form>
          </Form>
        </div>

        <div className="hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-white md:block">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Mobile Experience</p>
          <h2 className="mt-2 text-2xl font-bold">Sadece Sofor Uygulamasi</h2>
          <p className="mt-2 text-sm text-white/70">
            App tarafinda surucu kendi isi, kendi araci, bildirimleri, yakit talebi ve asama guncellemelerini yapar.
          </p>
        </div>
      </div>
    </div>
  );
}
