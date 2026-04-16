"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/live-operations": "Canlı Operasyon",
  "/activities": "İşlem Kayıtları",
  "/messages": "Mesajlar",
  "/orders/operations-summary": "Evrak Özeti",
  "/orders": "Tüm Siparişler",
  "/orders/domestic": "Yurtiçi Siparişler",
  "/orders/import": "İthalat Siparişleri",
  "/orders/export": "İhracat Siparişleri",
  "/vehicles": "Araçlar (Çekici)",
  "/trailers": "Dorseler",
  "/drivers": "Sürücüler",
  "/fuel": "Yakıt Kayıtları",
  "/notifications": "Bildirimler",
  "/users": "Kullanıcılar",
  "/customers": "Müşteriler",
  "/suppliers": "Tedarikçiler",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const matchedKey = Object.keys(titleMap)
    .sort((a, b) => b.length - a.length)
    .find((key) => pathname === key || pathname.startsWith(`${key}/`));
  const title = matchedKey ? titleMap[matchedKey] : "Daylog";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="surface-panel page-enter rounded-2xl p-4 md:p-5 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
