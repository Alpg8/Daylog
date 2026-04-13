import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Fuel, Home, UserCircle2 } from "lucide-react";
import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth();
  if (user.role !== "DRIVER") {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <p className="text-xs text-muted-foreground">Surucu Operasyon</p>
        <h1 className="text-lg font-semibold">Merhaba, {user.name}</h1>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-2 p-2">
          <Link href="/driver" className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <Home className="h-4 w-4" /> Islerim
          </Link>
          <Link href="/driver/notifications" className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <Bell className="h-4 w-4" /> Bildirimler
          </Link>
          <Link href="/driver/fuel-request" className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <Fuel className="h-4 w-4" /> Yakit
          </Link>
          <Link href="/driver/profile" className="flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <UserCircle2 className="h-4 w-4" /> Profil
          </Link>
        </div>
      </nav>
    </div>
  );
}
