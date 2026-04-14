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
  Mail,
  Radio,
  ChevronDown,
  ArrowDownToLine,
  ArrowUpFromLine,
  MapPin,
  UserCog,
  PanelLeftClose,
  PanelLeftOpen,
  History,
  FolderOpen,
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
  { title: "Evrak Özeti", href: "/orders/operations-summary", icon: FolderOpen },
  { title: "Araçlar (Çekici)", href: "/vehicles", icon: Truck },
  { title: "Dorseler", href: "/trailers", icon: Caravan as React.ElementType },
  { title: "Sürücüler", href: "/drivers", icon: Users },
  { title: "Yakıt Kayıtları", href: "/fuel", icon: FuelIcon },
  { title: "Canli Operasyon", href: "/live-operations", icon: Radio },
  { title: "Islem Kayitlari", href: "/activities", icon: History },
  { title: "Mesajlar", href: "/messages", icon: Mail },
  { title: "Bildirimler", href: "/notifications", icon: Bell },
  { title: "Kullanıcılar", href: "/users", icon: UserCog },
];

export function Sidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(["Siparişler"]);
  const [collapsed, setCollapsed] = useState(false);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-border bg-background/60 backdrop-blur-2xl dark:bg-white/[0.03] dark:border-white/[0.06] transition-all duration-300 overflow-hidden shrink-0",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Subtle inner glow at top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

      {/* Logo + collapse toggle */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-border dark:border-white/[0.06]",
          collapsed ? "justify-center px-2" : "justify-between px-5"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Daylog"
              width={120}
              height={32}
              className="dark:brightness-0 dark:invert"
              priority
            />
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:text-cyan-300">
              CRM
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/[0.07] hover:text-foreground transition-colors shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            if (item.children) {
              const isOpen = openGroups.includes(item.title);
              const isGroupActive = item.children.some((child) => isActive(child.href));

              if (collapsed) {
                return (
                  <Link
                    key={item.title}
                    href={item.children[0].href}
                    title={item.title}
                    className={cn(
                      "flex items-center justify-center rounded-xl p-2 transition-all duration-200",
                      isGroupActive
                        ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-foreground border border-border shadow-sm"
                        : "text-muted-foreground hover:bg-foreground/[0.07] hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                  </Link>
                );
              }

              return (
                <div key={item.title}>
                  <button
                    onClick={() => toggleGroup(item.title)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                      isGroupActive
                        ? "bg-cyan-500/10 text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-foreground/[0.07] hover:text-foreground"
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.title}
                    </span>
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-180")}
                    />
                  </button>
                  {isOpen && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border dark:border-white/[0.07] pl-3">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-200",
                            isActive(child.href)
                              ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-foreground font-medium border border-border shadow-sm"
                              : "text-muted-foreground hover:bg-foreground/[0.07] hover:text-foreground"
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
                title={collapsed ? item.title : undefined}
                className={cn(
                  "flex items-center rounded-xl transition-all duration-200",
                  collapsed ? "justify-center p-2" : "gap-3 px-3 py-2 text-sm",
                  isActive(item.href!)
                    ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-foreground font-medium border border-border shadow-sm"
                    : "text-muted-foreground hover:bg-foreground/[0.07] hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.title}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
