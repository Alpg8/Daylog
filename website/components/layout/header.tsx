"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Moon, Sun, LogOut, User, Bell } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch initial unread count
  useEffect(() => {
    fetch("/api/notifications?unread=true")
      .then((r) => r.json())
      .then((d) => { if (typeof d.unreadCount === "number") setUnreadCount(d.unreadCount); })
      .catch(() => {});
  }, []);

  // Connect to SSE stream for real-time notifications
  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data as string) as { event: string; title: string; message: string };
        if (payload.event === "notification") {
          setUnreadCount((c) => c + 1);
          toast.info(payload.title, { description: payload.message });
        }
      } catch { /* ignore malformed frames */ }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("Çıkış yapıldı");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Çıkış yapılırken hata oluştu");
    }
  };

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AU";

  const todayLabel = new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());

  return (
    <header className="relative flex h-16 items-center justify-between border-b border-border dark:border-white/[0.06] bg-background/65 backdrop-blur-xl dark:bg-white/[0.03] px-4 md:px-6">
      {/* Top highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />
      <div className="min-w-0">
        <h1 className="truncate text-base md:text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground capitalize">{todayLabel}</p>
      </div>

      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9 rounded-xl"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-xl"
          onClick={() => {
            setUnreadCount(0);
            router.push("/notifications");
          }}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-9 w-9 ring-2 ring-white/10 ring-offset-0">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/users")}>
              <User className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Çıkış Yap</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
