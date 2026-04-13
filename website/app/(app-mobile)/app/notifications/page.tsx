"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface DriverNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function AppNotificationsPage() {
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/driver/notifications", {
      headers: { "x-client-source": "APP" },
    });

    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications ?? []);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 12000);
    return () => clearInterval(timer);
  }, [fetchData]);

  return (
    <div className="space-y-2">
      {notifications.map((item) => (
        <Card key={item.id}>
          <CardContent className="space-y-1 p-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{item.type}</Badge>
              {!item.isRead ? <Badge variant="secondary">Yeni</Badge> : null}
            </div>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.message}</p>
            <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString("tr-TR")}</p>
          </CardContent>
        </Card>
      ))}
      {notifications.length === 0 ? <p className="text-sm text-muted-foreground">Bildirim yok.</p> : null}
    </div>
  );
}
