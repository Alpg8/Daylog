"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Truck,
  Caravan,
  Users,
  FuelIcon,
  Bell,
  ChevronDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  MapPin,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: { title: string; href: string; icon: React.ElementType }[];
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    title: "Siparişler",
    icon: Package,
    children: [
      { title: "Tüm Siparişler", href: "/orders", icon: Package },
      { title: "Yurtiçi", href: "/orders/domestic", icon: MapPin },
      { title: "İthalat", href: "/orders/import", icon: ArrowDownToLine },
      { title: "İhracat", href: "/orders/export", icon: ArrowUpFromLine },
    ],
  },
  { title: "Araçlar (Çekici)", href: "/vehicles", icon: Truck },
  { title: "Dorseler", href: "/trailers", icon: Caravan as React.ElementType },
  { title: "Sürücüler", href: "/drivers", icon: Users },
  { title: "Yakıt Kayıtları", href: "/fuel", icon: FuelIcon },
  { title: "Bildirimler", href: "/notifications", icon: Bell },
  { title: "Kullanıcılar", href: "/users", icon: UserCog },
];

export function Sidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(["Siparişler"]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="relative flex h-full w-64 flex-col border-r border-white/[0.06] bg-white/[0.03] backdrop-blur-2xl">
      {/* Subtle inner glow at top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      {/* Logo */}
      <div className="flex h-16 items-center border-b border-white/[0.06] px-5">
        <Image
          src="/logo.png"
          alt="Daylog"
          width={130}
          height={36}
          className="brightness-0 invert"
          priority
        />
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            if (item.children) {
              const isOpen = openGroups.includes(item.title);
              const isGroupActive = item.children.some((child) => isActive(child.href));
              return (
                <div key={item.title}>
                  <button
                    onClick={() => toggleGroup(item.title)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      isGroupActive
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-white/50 hover:bg-white/[0.07] hover:text-white/80"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </span>
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-180")}
                    />
                  </button>
                  {isOpen && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/[0.07] pl-3">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200",
                            isActive(child.href)
                              ? "bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white font-medium border border-white/10 shadow-sm"
                              : "text-white/40 hover:bg-white/[0.07] hover:text-white/70"
                          )}
                        >
                          <child.icon className="h-3.5 w-3.5" />
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200",
                  isActive(item.href!)
                    ? "bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-white font-medium border border-white/10 shadow-sm"
                    : "text-white/50 hover:bg-white/[0.07] hover:text-white/80"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
