"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
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

const TYPE_FILTERS = ["HEPSI", "INFO", "SUCCESS", "WARNING", "ERROR", "TASK"] as const;
type TypeFilter = typeof TYPE_FILTERS[number];

function groupByDate(notifications: Notification[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: Notification[] }[] = [];
  const map = new Map<string, Notification[]>();

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Bugün";
    else if (d.getTime() === yesterday.getTime()) label = "Dün";
    else label = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(n);
  }

  for (const [label, items] of map.entries()) {
    groups.push({ label, items });
  }
  return groups;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("HEPSI");
  const [unreadOnly, setUnreadOnly] = useState(false);

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

  const filtered = useMemo(() => {
    let list = notifications;
    if (typeFilter !== "HEPSI") list = list.filter(n => n.type === typeFilter);
    if (unreadOnly) list = list.filter(n => !n.isRead);
    return list;
  }, [notifications, typeFilter, unreadOnly]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type filter */}
        <div className="flex gap-1 bg-black/5 rounded-lg p-1 w-fit">
          {TYPE_FILTERS.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                typeFilter === t
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5"
              }`}
            >
              {t === "HEPSI" ? "Hepsi" : typeLabel[t]}
              <span className="ml-1 text-muted-foreground/60">
                ({t === "HEPSI" ? notifications.length : notifications.filter(n => n.type === t).length})
              </span>
            </button>
          ))}
        </div>
        {/* Unread toggle */}
        <button
          onClick={() => setUnreadOnly(v => !v)}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            unreadOnly
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {unreadOnly && <X className="h-3 w-3" />}
          Yalnızca okunmamış
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <Bell className="h-12 w-12" />
          <p>Bildirim yok</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.label} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-1">
                {group.label}
              </h3>
              <div className="space-y-1.5">
                {group.items.map(n => (
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
