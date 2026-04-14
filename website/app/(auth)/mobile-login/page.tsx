"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Moon, Smartphone, Sun, Truck, UserCircle2 } from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/layout/theme-provider";

const schema = z.object({
  email: z.string().email("Gecerli e-posta girin"),
  password: z.string().min(1, "Sifre gereklidir"),
});

type FormData = z.infer<typeof schema>;

export default function MobileLoginPage() {
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
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-600 shadow-2xl shadow-emerald-500/30">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Daylog Mobile App</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sofor Girisi</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">E-posta</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="driver@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sifre</FormLabel>
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

              <p className="text-center text-xs">
                <span className="text-muted-foreground">Web yonetim icin </span>
                <Link href="/login" className="text-primary underline">web giris ekranina</Link>
                <span className="text-muted-foreground"> gidin.</span>
              </p>

              <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] text-muted-foreground">
                <div className="rounded-lg border border-border/70 bg-background/30 px-2 py-2 text-center">
                  <Truck className="mx-auto mb-1 h-3.5 w-3.5" />
                  Islerim
                </div>
                <div className="rounded-lg border border-border/70 bg-background/30 px-2 py-2 text-center">
                  <UserCircle2 className="mx-auto mb-1 h-3.5 w-3.5" />
                  Sofor
                </div>
                <div className="rounded-lg border border-border/70 bg-background/30 px-2 py-2 text-center">
                  <Smartphone className="mx-auto mb-1 h-3.5 w-3.5" />
                  Mobil
                </div>
              </div>
            </form>
          </Form>
        </div>

        <div className="surface-panel hidden rounded-3xl p-6 text-foreground md:block">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Mobile Experience</p>
          <h2 className="mt-2 text-2xl font-bold">Sadece Sofor Uygulamasi</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            App tarafinda surucu kendi isi, kendi araci, bildirimleri, yakit talebi ve asama guncellemelerini yapar.
          </p>
        </div>
      </div>
    </div>
  );
}
