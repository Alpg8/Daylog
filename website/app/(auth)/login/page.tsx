"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Globe, Loader2, Moon, ShieldCheck, Sun } from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/layout/theme-provider";

const schema = z.object({
  email: z.string().email("Geçerli e-posta girin"),
  password: z.string().min(1, "Şifre gereklidir"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
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
      setError(e.error ?? "Giriş başarısız");
      return;
    }
    const payload = await res.json();
    toast.success("Giriş başarılı");
    router.push(payload?.user?.role === "DRIVER" ? "/mobile-login" : "/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen px-4 py-8 text-foreground">
      <div className="mx-auto grid w-full max-w-5xl gap-6 md:grid-cols-2 md:items-center">
      <div className="glass-strong glass-highlight relative w-full rounded-3xl p-8">
        <div className="absolute right-4 top-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Tema degistir</span>
          </Button>
        </div>
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-2xl shadow-blue-500/40 animate-float">
            <Globe className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Daylog Web Panel</h1>
          <p className="mt-1 text-sm text-muted-foreground">Admin ve Operasyon Girisi</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-posta</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="admin@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Şifre</FormLabel>
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

            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Giriş yapılıyor...</>
              ) : "Giriş Yap"}
            </Button>

            <p className="text-center text-xs text-white/50">
              <span className="text-muted-foreground">Sofor uygulamasi icin </span>
              <Link href="/mobile-login" className="text-primary underline">mobil giris ekranini</Link>
              <span className="text-muted-foreground"> kullanin.</span>
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-muted-foreground">
              <div className="rounded-lg border border-border/70 bg-background/30 px-2 py-2 text-center">
                <ShieldCheck className="mx-auto mb-1 h-3.5 w-3.5" />
                Secure
              </div>
              <div className="rounded-lg border border-border/70 bg-background/30 px-2 py-2 text-center">
                <Globe className="mx-auto mb-1 h-3.5 w-3.5" />
                Web
              </div>
              <div className="rounded-lg border border-border/70 bg-background/30 px-2 py-2 text-center">
                <ShieldCheck className="mx-auto mb-1 h-3.5 w-3.5" />
                Ops
              </div>
            </div>
          </form>
        </Form>

        {/* Bottom decoration */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          Daylog © 2026 — Lojistik CRM
        </div>
      </div>

      <div className="surface-panel hidden rounded-3xl p-6 text-foreground md:block">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Web Management</p>
        <h2 className="mt-2 text-2xl font-bold">Tum Isleri Web Panelde Yonetin</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Operasyon, sofor, arac ve siparis takibini web panelinden yonetin.
        </p>
        <div className="mt-4 rounded-2xl border border-border/70 bg-background/50 p-4">
          <svg viewBox="0 0 620 280" className="h-auto w-full" role="img" aria-label="Trucker and truck illustration">
            <rect x="36" y="186" width="548" height="10" rx="5" fill="#94A3B8" opacity="0.35" />
            <rect x="186" y="100" width="284" height="82" rx="12" fill="#2563EB" />
            <rect x="472" y="122" width="88" height="60" rx="10" fill="#1D4ED8" />
            <rect x="478" y="128" width="48" height="22" rx="4" fill="#BFDBFE" />
            <rect x="214" y="116" width="226" height="48" rx="8" fill="#60A5FA" />
            <circle cx="242" cy="194" r="26" fill="#0F172A" />
            <circle cx="242" cy="194" r="12" fill="#E2E8F0" />
            <circle cx="506" cy="194" r="26" fill="#0F172A" />
            <circle cx="506" cy="194" r="12" fill="#E2E8F0" />

            <circle cx="94" cy="78" r="15" fill="#FB923C" />
            <rect x="80" y="94" width="28" height="40" rx="8" fill="#C2410C" />
            <rect x="64" y="108" width="16" height="12" rx="4" fill="#7C2D12" />
            <rect x="108" y="108" width="16" height="12" rx="4" fill="#7C2D12" />
            <rect x="78" y="132" width="12" height="34" rx="5" fill="#1E293B" />
            <rect x="98" y="132" width="12" height="34" rx="5" fill="#1E293B" />
          </svg>
        </div>
      </div>
      </div>
    </div>
  );
}

