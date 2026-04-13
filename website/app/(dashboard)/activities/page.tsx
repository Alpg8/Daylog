"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";

interface ActivityLog {
  id: string;
  source: "WEB" | "APP" | "SYSTEM";
  action: string;
  entityType: string;
  entityId: string | null;
  message: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string; role: string } | null;
}

export default function ActivitiesPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");

  const fetchLogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (sourceFilter !== "ALL") params.set("source", sourceFilter);

    const res = await fetch(`/api/activities?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs ?? []);
    }
  }, [sourceFilter]);

  useEffect(() => {
    fetchLogs();
    const timer = setInterval(fetchLogs, 12000);
    return () => clearInterval(timer);
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <PageHeader title="Kullanici Islem Kayitlari" />

      <Card>
        <CardContent className="p-4">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tum Kaynaklar</SelectItem>
              <SelectItem value="WEB">WEB</SelectItem>
              <SelectItem value="APP">APP</SelectItem>
              <SelectItem value="SYSTEM">SYSTEM</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Son Islemler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{log.source}</Badge>
                <Badge variant="secondary">{log.action}</Badge>
                <span className="text-muted-foreground">{log.entityType}</span>
              </div>
              <p className="mt-1 text-sm">{log.message || "-"}</p>
              <p className="text-xs text-muted-foreground">Kullanici: {log.user?.name || "SYSTEM"} / {log.user?.role || "-"}</p>
              <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString("tr-TR")}</p>
            </div>
          ))}
          {logs.length === 0 ? <p className="text-sm text-muted-foreground">Islem kaydi yok.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
