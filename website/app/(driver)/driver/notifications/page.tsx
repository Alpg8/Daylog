"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const TYPE_COLORS: Record<string, string> = {
  INFO: "border-blue-500/30 bg-blue-500/5",
  SUCCESS: "border-emerald-500/30 bg-emerald-500/5",
  WARNING: "border-amber-500/30 bg-amber-500/5",
  ERROR: "border-red-500/30 bg-red-500/5",
  TASK: "border-violet-500/30 bg-violet-500/5",
};

interface DriverNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function DriverNotificationsPage() {
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/driver/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 15000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const markAllRead = async () => {
    await fetch("/api/driver/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    fetchData();
  };

  const markRead = async (id: string) => {
    await fetch("/api/driver/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  };

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{unreadCount} okunmamis bildirim</p>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
            <CheckCheck className="mr-1 h-3.5 w-3.5" /> Tumunu Oku
          </Button>
        </div>
      )}

      {notifications.map((item) => (
        <Card
          key={item.id}
          className={`transition-colors ${!item.isRead ? TYPE_COLORS[item.type] ?? "" : "opacity-70"}`}
          onClick={() => !item.isRead && markRead(item.id)}
        >
          <CardContent className="space-y-1 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.type}</Badge>
                {!item.isRead && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Yeni</Badge>}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {new Date(item.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.message}</p>
          </CardContent>
        </Card>
      ))}

      {notifications.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Bildirim yok.</p>
      )}
    </div>
  );
}
