"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

const titleMap: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/orders": "Tüm Seferler",
  "/orders/domestic": "Yurt İçi Seferler",
  "/orders/import": "İthalat Seferleri",
  "/orders/export": "İhracat Seferleri",
  "/vehicles": "Araçlar",
  "/trailers": "Dorseler",
  "/drivers": "Sürücüler",
  "/fuel": "Yakıt Kayıtları",
  "/notifications": "Bildirimler",
  "/users": "Kullanıcılar",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const title = titleMap[pathname] ?? "Daylog";

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
