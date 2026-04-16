"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  RefreshCw,
  Truck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AttachmentManager } from "@/components/shared/attachment-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TRAILER_ATTACHMENT_LABEL_OPTIONS } from "@/lib/document-presets";
import type { Attachment } from "@/types";

const ORDER_ATTACHMENT_LABEL_OPTIONS = [
  "CMR",
  "Fatura",
  "Irsaliye",
  "Teslim Belgesi",
  "Gumruk Evragi",
  "Operasyon Notu",
];

const EVENT_LABELS: Record<string, string> = {
  START_JOB: "Is Basladi",
  LOAD: "Yukleme",
  UNLOAD: "Bosaltma",
  DELIVERY: "Teslim",
  WAITING: "Bekleme",
  ISSUE: "Sorun",
  HANDOVER: "Devir Teslim",
  END_JOB: "Is Bitti",
  START_SHIFT: "Vardiya Basladi",
  END_SHIFT: "Vardiya Bitti",
};

const CONFIRMATION_LABELS: Record<string, string> = {
  JOB_STARTED: "Ise basladigini onayladi",
  LOADING_CONFIRMED: "Yuklemeyi onayladi",
  DELIVERY_CONFIRMED: "Teslimi onayladi",
  VEHICLE_HANDED_OVER: "Araci devretti",
  DELIVERY_RECEIVED: "Teslim aldi",
  DOCUMENT_UPLOADED: "Evraki yukledi",
  DAMAGE_CONFIRMED: "Hasar bilgisini onayladi",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planli",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandi",
  CANCELLED: "Iptal",
  PENDING: "Beklemede",
};

const SEVERITY_COLORS: Record<string, string> = {
  NORMAL: "border-primary bg-primary/20",
  WARNING: "border-amber-500 bg-amber-500/20",
  CRITICAL: "border-red-500 bg-red-500/20",
};

interface TimelineResponse {
  order: {
    id: string;
    status: string;
    jobType: "LOADING" | "UNLOADING" | null;
    cargoNumber: string | null;
    tripNumber: string | null;
    routeText: string | null;
    phaseStartLocation: string | null;
    phaseLoadLocation: string | null;
    phaseUnloadLocation: string | null;
    phaseDeliveryLocation: string | null;
    driver?: { id: string; fullName: string } | null;
    vehicle?: { id: string; plateNumber: string } | null;
    trailer?: { id: string; plateNumber: string } | null;
    driverEvents: Array<{
      id: string;
      type: string;
      severity: string;
      eventAt: string;
      notes: string | null;
      odometerKm: number | null;
      phaseData: Record<string, unknown> | null;
      driver: { id: string; fullName: string };
      photos: Array<{ id: string; url: string; label: string | null }>;
    }>;
    driverConfirmations: Array<{
      id: string;
      type: string;
      statement: string;
      status: string;
      confirmedAt: string;
    }>;
    handovers: Array<{
      id: string;
      status: string;
      handoverAt: string;
      notes: string | null;
      fromDriver: { fullName: string };
      toDriver: { fullName: string } | null;
    }>;
    notes: string | null;
  };
  warnings: Array<{ code: string; message: string }>;
}

function AttachmentList({
  attachments,
  emptyLabel,
}: {
  attachments: Attachment[];
  emptyLabel: string;
}) {
  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <div className="min-w-0">
            <a
              href={attachment.url}
              target="_blank"
              rel="noreferrer"
              className="truncate font-medium text-primary underline-offset-4 hover:underline"
            >
              {attachment.label || "Dosya"}
            </a>
            <p className="text-xs text-muted-foreground">
              {attachment.mimeType || "Bilinmeyen tip"} · {new Date(attachment.createdAt).toLocaleString("tr-TR")}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{(((attachment.size ?? 0) / 1024)).toFixed(1)} KB</span>
        </div>
      ))}
    </div>
  );
}

function getPhaseRows(jobType: "LOADING" | "UNLOADING" | null) {
  const base = [
    { key: "phaseStartLocation" as const, label: "Is Baslat Konumu", eventType: "START_JOB" },
    { key: "phaseLoadLocation" as const, label: "Yukleme Konumu", eventType: "LOAD" },
    { key: "phaseUnloadLocation" as const, label: "Bosaltma Konumu", eventType: "UNLOAD" },
    { key: "phaseDeliveryLocation" as const, label: "Teslim Konumu", eventType: "DELIVERY" },
  ];
  if (jobType === "LOADING") return base.filter((r) => r.key !== "phaseUnloadLocation");
  if (jobType === "UNLOADING") return base.filter((r) => r.key !== "phaseLoadLocation");
  return base;
}

export default function OrderOperationsDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [orderAttachments, setOrderAttachments] = useState<Attachment[]>([]);
  const [trailerAttachments, setTrailerAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [phaseLocations, setPhaseLocations] = useState<Record<string, string>>({});
  const [phaseSaving, setPhaseSaving] = useState<Record<string, boolean>>({});
  const [notesEditing, setNotesEditing] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [notesSaving, startNotesSaving] = useTransition();
  const [allDrivers, setAllDrivers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [allVehicles, setAllVehicles] = useState<Array<{ id: string; plateNumber: string }>>([]);
  const [allTrailers, setAllTrailers] = useState<Array<{ id: string; plateNumber: string }>>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDriverId, setAssignDriverId] = useState("__none__");
  const [assignVehicleId, setAssignVehicleId] = useState("__none__");
  const [assignTrailerId, setAssignTrailerId] = useState("__none__");
  const [assignLoading, setAssignLoading] = useState(false);

  const loadAttachments = useCallback(async (trailerId?: string | null) => {
    setAttachmentsLoading(true);
    try {
      const orderRequest = fetch(`/api/orders/${params.id}/attachments`);
      const trailerRequest = trailerId ? fetch(`/api/trailers/${trailerId}/attachments`) : null;

      const [orderResponse, trailerResponse] = await Promise.all([
        orderRequest,
        trailerRequest ?? Promise.resolve(null),
      ]);

      const orderPayload = orderResponse ? await orderResponse.json() : { attachments: [] };
      const trailerPayload = trailerResponse ? await trailerResponse.json() : { attachments: [] };

      setOrderAttachments(orderResponse?.ok ? (orderPayload.attachments ?? []) : []);
      setTrailerAttachments(trailerResponse?.ok ? (trailerPayload.attachments ?? []) : []);
    } finally {
      setAttachmentsLoading(false);
    }
  }, [params.id]);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/driver/orders/${params.id}/timeline`);
    if (res.ok) {
      const payload = (await res.json()) as TimelineResponse;
      setData(payload);
      void loadAttachments(payload.order.trailer?.id);
    }
  }, [loadAttachments, params.id]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 12000);
    return () => clearInterval(timer);
  }, [fetchData]);

  useEffect(() => {
    async function loadLists() {
      const [dRes, vRes, tRes] = await Promise.all([
        fetch("/api/drivers?pageSize=500"),
        fetch("/api/vehicles?pageSize=500"),
        fetch("/api/trailers?pageSize=500"),
      ]);
      if (dRes.ok) { const j = await dRes.json(); setAllDrivers(j.drivers ?? j.data ?? []); }
      if (vRes.ok) { const j = await vRes.json(); setAllVehicles(j.vehicles ?? j.data ?? []); }
      if (tRes.ok) { const j = await tRes.json(); setAllTrailers(j.trailers ?? j.data ?? []); }
    }
    void loadLists();
  }, []);

  useEffect(() => {
    if (data?.order) {
      setPhaseLocations({
        phaseStartLocation: data.order.phaseStartLocation ?? "",
        phaseLoadLocation: data.order.phaseLoadLocation ?? "",
        phaseUnloadLocation: data.order.phaseUnloadLocation ?? "",
        phaseDeliveryLocation: data.order.phaseDeliveryLocation ?? "",
      });
      if (!notesEditing) setNotesValue(data.order.notes ?? "");
    }
  }, [data?.order.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function savePhaseLocation(phase: "START_JOB" | "LOAD" | "UNLOAD" | "DELIVERY", locationKey: string) {
    const location = phaseLocations[locationKey];
    if (!location?.trim()) return;
    setPhaseSaving((prev) => ({ ...prev, [locationKey]: true }));
    try {
      const res = await fetch(`/api/orders/${params.id}/phase-location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, location }),
      });
      if (res.ok) void fetchData();
    } finally {
      setPhaseSaving((prev) => ({ ...prev, [locationKey]: false }));
    }
  }

  function openAssignDialog() {
    if (!data) return;
    setAssignDriverId(data.order.driver?.id ?? "__none__");
    setAssignVehicleId((data.order.vehicle as { id?: string } | null | undefined)?.id ?? "__none__");
    setAssignTrailerId(data.order.trailer?.id ?? "__none__");
    setAssignOpen(true);
  }

  async function handleSaveAssignment() {
    setAssignLoading(true);
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: assignDriverId === "__none__" ? null : assignDriverId,
          vehicleId: assignVehicleId === "__none__" ? null : assignVehicleId,
          trailerId: assignTrailerId === "__none__" ? null : assignTrailerId,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Kaydedilemedi");
      }
      toast.success("Atama güncellendi");
      setAssignOpen(false);
      void fetchData();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setAssignLoading(false);
    }
  }

  if (!data) return <p className="text-sm text-muted-foreground">Yukleniyor...</p>;

  const order = data.order;
  const totalPhotos = order.driverEvents.reduce((n, e) => n + e.photos.length, 0);

  return (
    <>
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Operasyon ve Siparis Dosyalari</CardTitle>
            <p className="text-sm text-muted-foreground">
              Operasyona ait siparis evraklarini ve varsa dorse dosyalarini bu alandan yonetin.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AttachmentManager
              title="Siparis Dosyalari"
              description="CMR, fatura ve operasyon belgelerini yukleyin."
              entityId={order.id}
              endpointBase="/api/orders"
              triggerLabel="Siparis Dosyalari"
              labelOptions={ORDER_ATTACHMENT_LABEL_OPTIONS}
            />
            {order.trailer ? (
              <AttachmentManager
                title="Dorse Dosyalari"
                description="Dorseye ait ruhsat ve diger operasyon dosyalarini yonetin."
                entityId={order.trailer.id}
                endpointBase="/api/trailers"
                triggerLabel="Dorse Dosyalari"
                labelOptions={TRAILER_ATTACHMENT_LABEL_OPTIONS}
              />
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">Siparis Dosyalari</h3>
                  <p className="text-xs text-muted-foreground">Siparise yuklenen operasyon evraklari</p>
                </div>
                <Badge variant="outline">{orderAttachments.length}</Badge>
              </div>
              {attachmentsLoading ? (
                <p className="text-sm text-muted-foreground">Dosyalar yukleniyor...</p>
              ) : (
                <AttachmentList attachments={orderAttachments} emptyLabel="Siparise ait dosya yok." />
              )}
            </div>

            <div className="rounded-xl border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">Dorse Dosyalari</h3>
                  <p className="text-xs text-muted-foreground">
                    {order.trailer ? `${order.trailer.plateNumber} icin yuklenen dosyalar` : "Bu siparise dorse atanmamis."}
                  </p>
                </div>
                {order.trailer ? <Badge variant="outline">{trailerAttachments.length}</Badge> : null}
              </div>
              {!order.trailer ? (
                <p className="text-sm text-muted-foreground">Dorse atanmadan dorse dosyalari gorunmez.</p>
              ) : attachmentsLoading ? (
                <p className="text-sm text-muted-foreground">Dosyalar yukleniyor...</p>
              ) : (
                <AttachmentList attachments={trailerAttachments} emptyLabel="Dorseye ait dosya yok." />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Operasyon Detayi</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {order.cargoNumber || "Yuk No Yok"}{order.tripNumber ? ` / Sefer: ${order.tripNumber}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="gap-2" onClick={openAssignDialog}>
              <UserPlus className="h-4 w-4" />
              {order.driver ? "Atama Değiştir" : "Sürücü Ata"}
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={order.status === "COMPLETED" ? "secondary" : "default"}>{STATUS_LABELS[order.status] ?? order.status}</Badge>
            </div>
            {order.driver && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Link href={`/drivers/${order.driver.id}`} className="text-primary underline">{order.driver.fullName}</Link>
              </div>
            )}
            {order.vehicle && (
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-muted-foreground" /> {order.vehicle.plateNumber}
              </div>
            )}
            {order.routeText && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" /> {order.routeText}
              </div>
            )}
          </div>

          {/* Summary stats */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <div className="rounded-lg border p-2 text-center">
              <p className="text-lg font-bold">{order.driverEvents.length}</p>
              <p className="text-[10px] text-muted-foreground">Aksiyon</p>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <p className="text-lg font-bold">{totalPhotos}</p>
              <p className="text-[10px] text-muted-foreground">Fotograf</p>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <p className="text-lg font-bold">{order.driverConfirmations.length}</p>
              <p className="text-[10px] text-muted-foreground">Onam</p>
            </div>
            <div className="rounded-lg border p-2 text-center">
              <p className="text-lg font-bold">{order.handovers.length}</p>
              <p className="text-[10px] text-muted-foreground">Devir</p>
            </div>
          </div>
          {/* Notes inline editor */}
          <div className="mt-4 rounded-xl border border-border/60 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notlar</p>
              {!notesEditing && (
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs" onClick={() => { setNotesValue(order.notes ?? ""); setNotesEditing(true); }}>
                  <Pencil className="h-3.5 w-3.5" /> Düzenle
                </Button>
              )}
            </div>
            {notesEditing ? (
              <div className="space-y-2">
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 gap-1.5 text-xs" disabled={notesSaving} onClick={() => {
                    startNotesSaving(async () => {
                      await fetch(`/api/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: notesValue }) });
                      setNotesEditing(false);
                      void fetchData();
                    });
                  }}>
                    <Check className="h-3.5 w-3.5" /> Kaydet
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setNotesEditing(false)}>
                    <X className="h-3.5 w-3.5" /> İptal
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes || "Henüz not girilmemiş."}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" /> Eksik Islem Kontrolu ({data.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.warnings.map((w, i) => (
                <div key={`${w.code}-${i}`} className="flex items-center gap-2 rounded border border-amber-500/20 bg-background p-2 text-sm">
                  <Badge variant="outline" className="text-[10px] shrink-0">{w.code.replace("MISSING_", "")}</Badge>
                  <span className="text-xs">{w.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Faz Yönetimi */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Faz Konumlari
          </CardTitle>
          <p className="text-sm text-muted-foreground">Surucuya her faz icin konum/adres bilgisi gonderin.</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getPhaseRows(order.jobType).map((row) => (
              <div key={row.key} className="flex items-center gap-2">
                <div className="w-36 shrink-0">
                  <p className="text-xs font-medium">{row.label}</p>
                  {order[row.key] && <p className="text-[10px] text-emerald-600 mt-0.5">Kaydedildi</p>}
                </div>
                <Input
                  className="h-8 text-sm flex-1"
                  placeholder="Adres veya konum girin..."
                  value={phaseLocations[row.key] ?? ""}
                  onChange={(e) => setPhaseLocations((prev) => ({ ...prev, [row.key]: e.target.value }))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  disabled={phaseSaving[row.key] || !phaseLocations[row.key]?.trim()}
                  onClick={() => savePhaseLocation(row.eventType as "START_JOB" | "LOAD" | "UNLOAD" | "DELIVERY", row.key)}
                >
                  {phaseSaving[row.key] ? "..." : "Kaydet"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sürücü Fotoğrafları Gallery */}
      {totalPhotos > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4" /> Sürücü Fotoğrafları ({totalPhotos})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {order.driverEvents
              .filter((e) => e.photos.length > 0)
              .map((event) => (
                <div key={event.id} className="mb-4 last:mb-0">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{EVENT_LABELS[event.type] ?? event.type}</Badge>
                    <span className="text-xs text-muted-foreground">{event.driver.fullName}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{new Date(event.eventAt).toLocaleString("tr-TR")}</span>
                    {event.notes && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground italic truncate max-w-xs">{event.notes}</span>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {event.photos.map((photo) => (
                      <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer"
                        className="group relative block overflow-hidden rounded-lg border bg-muted aspect-square">
                        <img src={photo.url} alt={photo.label || "Foto"} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        {photo.label && (
                          <span className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 text-[10px] text-white truncate text-center">
                            {photo.label}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Event Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Event Timeline ({order.driverEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.driverEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henuz aksiyon yok.</p>
          ) : (
            <div className="relative space-y-0">
              {order.driverEvents.map((event, idx) => (
                <div key={event.id} className="relative pl-8 pb-4">
                  {idx < order.driverEvents.length - 1 && <div className="absolute left-[11px] top-5 bottom-0 w-px bg-border" />}
                  <div className={`absolute left-0 top-1 h-[22px] w-[22px] rounded-full border-2 ${SEVERITY_COLORS[event.severity] ?? SEVERITY_COLORS.NORMAL}`} />
                  <div className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{EVENT_LABELS[event.type] ?? event.type}</Badge>
                        <span className="text-muted-foreground">{event.driver.fullName}</span>
                        {event.photos.length > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <ImageIcon className="h-3 w-3" /> {event.photos.length}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(event.eventAt).toLocaleString("tr-TR")}</span>
                    </div>
                    {event.odometerKm && <p className="text-xs text-muted-foreground mt-0.5">Km: {event.odometerKm}</p>}
                    {event.notes && <p className="mt-1 text-muted-foreground">{event.notes}</p>}
                    {event.phaseData && Object.keys(event.phaseData).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        {Object.entries(event.phaseData).map(([k, v]) => (
                          <span key={k} className="text-xs text-muted-foreground"><span className="font-medium">{k.replace(/_/g, " ")}:</span> {String(v)}</span>
                        ))}
                      </div>
                    )}
                    {event.photos.length > 0 && (
                      <div className="mt-2 grid grid-cols-4 gap-2 lg:grid-cols-6">
                        {event.photos.map((photo) => (
                          <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-lg border">
                            <img src={photo.url} alt={photo.label || "Event foto"} className="h-20 w-full object-cover transition-transform group-hover:scale-105" />
                            {photo.label && <span className="absolute bottom-0 inset-x-0 bg-black/50 px-1 py-0.5 text-[10px] text-white truncate">{photo.label}</span>}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Onam Kayitlari ({order.driverConfirmations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.driverConfirmations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Onam kaydi yok.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {order.driverConfirmations.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      {CONFIRMATION_LABELS[item.type] ?? item.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(item.confirmedAt).toLocaleString("tr-TR")}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.statement}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Handovers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Devir Teslim ({order.handovers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {order.handovers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Devir teslim kaydi yok.</p>
          ) : (
            <div className="space-y-2">
              {order.handovers.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.status}</Badge>
                      <span>{item.fromDriver.fullName} → {item.toDriver?.fullName || "Belirtilmedi"}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(item.handoverAt).toLocaleString("tr-TR")}</span>
                  </div>
                  {item.notes && <p className="mt-1 text-muted-foreground">{item.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Sürücü / Araç / Dorse Atama Dialog */}
    <Dialog open={assignOpen} onOpenChange={(v) => { if (!v) setAssignOpen(false); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sürücü / Araç / Dorse Ata</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sürücü</p>
            <Select value={assignDriverId} onValueChange={setAssignDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Sürücü seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sürücü atama —</SelectItem>
                {allDrivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Araç (Çekici)</p>
            <Select value={assignVehicleId} onValueChange={setAssignVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Araç seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Araç atama —</SelectItem>
                {allVehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.plateNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dorse</p>
            <Select value={assignTrailerId} onValueChange={setAssignTrailerId}>
              <SelectTrigger>
                <SelectValue placeholder="Dorse seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Dorse atama —</SelectItem>
                {allTrailers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.plateNumber}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={assignLoading}>Vazgeç</Button>
          <Button onClick={handleSaveAssignment} disabled={assignLoading} className="gap-2">
            {assignLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
