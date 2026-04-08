"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import type { Notification } from "@/types";

const typeVariant: Record<string, "default" | "success" | "warning" | "destructive" | "info"> = {
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "destructive",
  TASK: "default",
};

const typeLabel: Record<string, string> = {
  INFO: "Bilgi",
  SUCCESS: "Başarılı",
  WARNING: "Uyarı",
  ERROR: "Hata",
  TASK: "Görev",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notifications");
    if (res.ok) { const j = await res.json(); setNotifications(j.notifications ?? j); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const markRead = async (id: string) => {
    const res = await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    if (res.ok) fetchData(); else toast.error("İşlem başarısız");
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    await Promise.all(unread.map(n => fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" })));
    toast.success("Tüm bildirimler okundu");
    fetchData();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Bildirimler${unreadCount > 0 ? ` (${unreadCount} okunmamış)` : ""}`}
        actions={unreadCount > 0 ? (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />Tümünü Okundu İşaretle
          </Button>
        ) : undefined}
      />
      {loading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Bell className="h-12 w-12" />
          <p>Bildirim yok</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <Card key={n.id} className={n.isRead ? "opacity-60" : ""}>
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={typeVariant[n.type] ?? "default"}>{typeLabel[n.type] ?? n.type}</Badge>
                    {!n.isRead && <Badge variant="secondary" className="text-xs">Yeni</Badge>}
                  </div>
                  <p className="font-medium text-sm">{n.title}</p>
                  {n.message && <p className="text-sm text-muted-foreground">{n.message}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString("tr-TR")}</p>
                </div>
                {!n.isRead && (
                  <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
