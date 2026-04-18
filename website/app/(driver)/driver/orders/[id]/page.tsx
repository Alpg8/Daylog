"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Check,
  MapPin,
  Truck,
  Upload,
  RefreshCw,
  Play,
  PackageCheck,
  PackageOpen,
  Hand,
  Flag,
  CircleAlert,
  Timer,
  ArrowRightLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/* ─── Constants ──────────────────────────────────────────────── */

const EVENT_LABELS: Record<string, string> = {
  START_JOB: "Is Basladi",
  LOAD: "Yukleme",
  UNLOAD: "Bosaltma",
  DELIVERY: "Teslim",
  WAITING: "Bekleme",
  ISSUE: "Sorun Bildirimi",
  HANDOVER: "Devir Teslim",
  END_JOB: "Is Bitti",
  START_SHIFT: "Vardiya Basladi",
  END_SHIFT: "Vardiya Bitti",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planli",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandi",
  CANCELLED: "Iptal",
  PENDING: "Beklemede",
};

const EVENT_TYPES = [
  "START_SHIFT", "END_SHIFT", "START_JOB", "LOAD", "UNLOAD",
  "DELIVERY", "WAITING", "ISSUE", "HANDOVER", "END_JOB",
] as const;

type EventType = (typeof EVENT_TYPES)[number];

/* ─── Operation flow steps ───────────────────────────────────── */

interface PhotoInputDef {
  key: string;
  label: string;
  required?: boolean;
}

interface DataFieldDef {
  key: string;
  label: string;
  type: "number" | "text";
}

interface FlowStep {
  eventType: EventType;
  label: string;
  icon: React.ElementType;
  requiresPhoto: boolean;
  photoLabels?: PhotoInputDef[];
  dataFields?: DataFieldDef[];
  phaseLocationKey?: "phaseStartLocation" | "phaseLoadLocation" | "phaseUnloadLocation" | "phaseDeliveryLocation";
}

const LOADING_FLOW: FlowStep[] = [
  {
    eventType: "START_JOB", label: "Isi Baslat", icon: Play,
    requiresPhoto: true, phaseLocationKey: "phaseStartLocation",
    photoLabels: [{ key: "genel", label: "Genel Foto", required: true }],
  },
  {
    eventType: "LOAD", label: "Yukleme", icon: PackageOpen,
    requiresPhoto: true, phaseLocationKey: "phaseLoadLocation",
    photoLabels: [
      { key: "kantar_fisi", label: "Kantar Fisi", required: true },
      { key: "genel", label: "Genel Foto", required: true },
    ],
    dataFields: [
      { key: "spanzet_count", label: "Spanzet Sayisi", type: "number" },
      { key: "stanga_count", label: "Stanga Sayisi", type: "number" },
      { key: "cita_count", label: "Cita Sayisi", type: "number" },
      { key: "equipment_note", label: "Ekipman Notu", type: "text" },
    ],
  },
  {
    eventType: "DELIVERY", label: "Teslim", icon: PackageCheck,
    requiresPhoto: true, phaseLocationKey: "phaseDeliveryLocation",
    photoLabels: [
      { key: "teslim", label: "Teslim Foto", required: true },
      { key: "masraf_fisi_1", label: "Masraf Fisi 1", required: false },
      { key: "masraf_fisi_2", label: "Masraf Fisi 2", required: false },
    ],
  },
];

const UNLOADING_FLOW: FlowStep[] = [
  {
    eventType: "START_JOB", label: "Isi Baslat", icon: Play,
    requiresPhoto: true, phaseLocationKey: "phaseStartLocation",
    photoLabels: [{ key: "genel", label: "Genel Foto", required: true }],
  },
  {
    eventType: "UNLOAD", label: "Bosaltma", icon: PackageCheck,
    requiresPhoto: true, phaseLocationKey: "phaseUnloadLocation",
    photoLabels: [
      { key: "smr", label: "SMR Foto", required: true },
      { key: "bosaltma_ani", label: "Bosaltma Ani Foto", required: true },
    ],
    dataFields: [
      { key: "outgoing_spanzet", label: "Cikan Spanzet Sayisi", type: "number" },
      { key: "tension_rod_count", label: "Gergi Cubugu Sayisi", type: "number" },
    ],
  },
  {
    eventType: "DELIVERY", label: "Teslim", icon: Flag,
    requiresPhoto: true, phaseLocationKey: "phaseDeliveryLocation",
    photoLabels: [
      { key: "teslim", label: "Teslim Foto", required: true },
      { key: "masraf_fisi_1", label: "Masraf Fisi 1", required: false },
      { key: "masraf_fisi_2", label: "Masraf Fisi 2", required: false },
    ],
  },
];

/* ─── Types ──────────────────────────────────────────────────── */

interface TimelineResponse {
  order: {
    id: string;
    status: string;
    jobType: "LOADING" | "UNLOADING" | null;
    cargoNumber: string | null;
    tripNumber: string | null;
    routeText: string | null;
    loadingAddress: string | null;
    deliveryAddress: string | null;
    phaseStartLocation: string | null;
    phaseLoadLocation: string | null;
    phaseUnloadLocation: string | null;
    phaseDeliveryLocation: string | null;
    vehicle?: { plateNumber: string } | null;
    trailer?: { plateNumber: string; type: string | null } | null;
    driver?: { id: string; fullName: string; phoneNumber: string | null } | null;
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
  };
}

interface DriverOption { id: string; fullName: string; }

/* ─── Page Component ─────────────────────────────────────────── */

export default function DriverOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [timeline, setTimeline] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const [eventNotes, setEventNotes] = useState("");
  const [eventKm, setEventKm] = useState("");
  const [advancedEventType, setAdvancedEventType] = useState<EventType>("WAITING");
  const [advancedSeverity, setAdvancedSeverity] = useState<"NORMAL" | "WARNING" | "CRITICAL">("NORMAL");

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadEventId, setUploadEventId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [handoverNotes, setHandoverNotes] = useState("");
  const [handoverToDriverId, setHandoverToDriverId] = useState("");
  const [availableDrivers, setAvailableDrivers] = useState<DriverOption[]>([]);

  const [phasePhotos, setPhasePhotos] = useState<Record<string, File | null>>({});
  const [phaseInputs, setPhaseInputs] = useState<Record<string, string>>({});
  const [phaseFormKey, setPhaseFormKey] = useState(0);

  /* ─── Data fetching ────────────────────────────────────── */

  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/driver/orders/${orderId}/timeline`);
      if (res.ok) {
        const data = (await res.json()) as TimelineResponse;
        setTimeline(data);
        if (!uploadEventId && data.order.driverEvents[0]) {
          setUploadEventId(data.order.driverEvents[0].id);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [orderId, uploadEventId]);

  useEffect(() => {
    fetchTimeline();
    const timer = setInterval(fetchTimeline, 12000);
    return () => clearInterval(timer);
  }, [fetchTimeline]);

  useEffect(() => {
    fetch("/api/drivers?isActive=true")
      .then((res) => (res.ok ? res.json() : { drivers: [] }))
      .then((data) => setAvailableDrivers(data.drivers ?? []))
      .catch(() => {});
  }, []);

  /* ─── Helpers ──────────────────────────────────────────── */

  const doneEventTypes = new Set(timeline?.order.driverEvents.map((e) => e.type) ?? []);
  const photoEventTypes = new Set(
    timeline?.order.driverEvents.filter((e) => e.photos.length > 0).map((e) => e.type) ?? []
  );

  const activeFlow = timeline?.order.jobType === "UNLOADING" ? UNLOADING_FLOW : LOADING_FLOW;

  function isStepDone(step: FlowStep) { return doneEventTypes.has(step.eventType); }
  function isStepPhotoOk(step: FlowStep) { return !step.requiresPhoto || photoEventTypes.has(step.eventType); }
  function getNextStep(): FlowStep | null {
    for (const step of activeFlow) { if (!isStepDone(step)) return step; }
    return null;
  }

  /* ─── Actions ──────────────────────────────────────────── */

  async function executeFlowStep(step: FlowStep) {
    // Validate required photos
    if (step.requiresPhoto && step.photoLabels) {
      const missingRequired = step.photoLabels.filter((p) => p.required && !phasePhotos[p.key]);
      if (missingRequired.length > 0) {
        toast.error(`Zorunlu foto eksik: ${missingRequired.map((p) => p.label).join(", ")}`);
        return;
      }
    } else if (step.requiresPhoto && !phasePhotos["genel"]) {
      toast.error("Bu islem icin gorsel yuklemeniz gerekli");
      return;
    }

    // Build phaseData from inputs
    const builtPhaseData: Record<string, string | number> = {};
    if (step.dataFields) {
      for (const field of step.dataFields) {
        const val = phaseInputs[field.key];
        if (val) builtPhaseData[field.key] = field.type === "number" ? Number(val) : val;
      }
    }

    setSubmitting(true);
    try {
      const eventRes = await fetch("/api/driver/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          type: step.eventType,
          notes: eventNotes || null,
          odometerKm: eventKm ? Number(eventKm) : null,
          phaseData: Object.keys(builtPhaseData).length > 0 ? builtPhaseData : undefined,
        }),
      });
      if (!eventRes.ok) { toast.error("Aksiyon kaydedilemedi"); return; }
      const eventData = await eventRes.json();
      const newEventId = eventData.event?.id as string | undefined;
      if (!newEventId) { toast.error("Event olusturuldu ancak kayit ID alinamadi"); return; }

      // Upload all required and optional photos that were provided
      const photosToUpload = step.photoLabels
        ? step.photoLabels.filter((p) => phasePhotos[p.key])
        : phasePhotos["genel"] ? [{ key: "genel", label: "Genel Foto" }] : [];

      for (const photoInput of photosToUpload) {
        const file = phasePhotos[photoInput.key];
        if (!file) continue;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("label", photoInput.key);
        await fetch(`/api/driver/events/${newEventId}/photos`, { method: "POST", body: formData });
      }

      toast.success(`${step.label} kaydedildi`);
      setUploadEventId(newEventId);
      setPhasePhotos({});
      setPhaseInputs({});
      setPhaseFormKey((k) => k + 1);

      if (step.eventType === "START_JOB" && timeline?.order.status === "PLANNED") {
        await fetch("/api/driver/update-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, status: "IN_PROGRESS" }) });
      }
      if (step.eventType === "DELIVERY") {
        await fetch("/api/driver/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, type: "END_JOB", notes: "Otomatik kapaniş" }) });
        await fetch("/api/driver/update-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, status: "COMPLETED" }) });
      }

      setEventNotes(""); setEventKm("");
      fetchTimeline();
    } finally { setSubmitting(false); }
  }

  async function createAdvancedEvent() {
    if (!uploadFile) {
      toast.error("Bu islem icin gorsel yuklemeniz gerekli");
      setActiveSection("photo");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/driver/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, type: advancedEventType, severity: advancedSeverity, notes: eventNotes || null, odometerKm: eventKm ? Number(eventKm) : null }),
      });
      if (!res.ok) { toast.error("Aksiyon kaydedilemedi"); return; }
      const data = await res.json();
      const newEventId = data.event?.id as string | undefined;
      if (!newEventId) {
        toast.error("Event ID alinamadi");
        return;
      }

      const photoForm = new FormData();
      photoForm.append("file", uploadFile);
      if (uploadLabel) photoForm.append("label", uploadLabel);
      const photoRes = await fetch(`/api/driver/events/${newEventId}/photos`, { method: "POST", body: photoForm });
      if (!photoRes.ok) {
        toast.error("Aksiyon kaydedildi fakat gorsel yuklenemedi");
        return;
      }

      toast.success(`${EVENT_LABELS[advancedEventType] ?? advancedEventType} kaydedildi`);
      setUploadEventId(newEventId);
      setUploadFile(null);
      setUploadLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setEventNotes(""); setEventKm(""); setActiveSection(null);
      fetchTimeline();
    } finally { setSubmitting(false); }
  }

  async function createHandover() {
    if (!uploadFile) {
      toast.error("Devir teslim icin gorsel yuklemeniz gerekli");
      setActiveSection("photo");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/driver/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, notes: handoverNotes || null, toDriverId: handoverToDriverId && handoverToDriverId !== "__none__" ? handoverToDriverId : null }),
      });
      if (!res.ok) { toast.error("Devir teslim kaydedilemedi"); return; }

      const timelineRes = await fetch(`/api/driver/orders/${orderId}/timeline`);
      if (timelineRes.ok) {
        const timelineData = (await timelineRes.json()) as TimelineResponse;
        const handoverEvent = timelineData.order.driverEvents.find((event) => event.type === "HANDOVER");
        if (handoverEvent) {
          const photoForm = new FormData();
          photoForm.append("file", uploadFile);
          if (uploadLabel) photoForm.append("label", uploadLabel);
          const photoRes = await fetch(`/api/driver/events/${handoverEvent.id}/photos`, {
            method: "POST",
            body: photoForm,
          });

          if (!photoRes.ok) {
            toast.error("Devir teslim kaydedildi fakat gorsel yuklenemedi");
            return;
          }
        }
      }

      toast.success("Devir teslim kaydedildi"); setHandoverNotes(""); setHandoverToDriverId(""); setActiveSection(null); fetchTimeline();
      setUploadFile(null);
      setUploadLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally { setSubmitting(false); }
  }

  async function uploadPhoto() {
    if (!uploadEventId || !uploadFile) { toast.error("Event ve dosya secmelisiniz"); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      if (uploadLabel) formData.append("label", uploadLabel);
      const res = await fetch(`/api/driver/events/${uploadEventId}/photos`, { method: "POST", body: formData });
      if (!res.ok) { toast.error("Fotograf yuklenemedi"); return; }
      toast.success("Fotograf yuklendi");
      setUploadFile(null); setUploadLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setActiveSection(null); fetchTimeline();
    } finally { setSubmitting(false); }
  }

  /* ─── Render ───────────────────────────────────────────── */

  if (loading || !timeline) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted/30" />)}
      </div>
    );
  }

  const order = timeline.order;
  const nextStep = getNextStep();
  const isCompleted = order.status === "COMPLETED" || order.status === "CANCELLED";

  return (
    <div className="space-y-3 pb-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/driver"><ArrowLeft className="mr-1 h-4 w-4" />Islerim</Link>
      </Button>

      {/* Order info */}
      <Card>
        <CardContent className="p-3.5">
          <div className="flex items-center justify-between">
            <Badge variant={isCompleted ? "secondary" : "default"}>{STATUS_LABELS[order.status] ?? order.status}</Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchTimeline}><RefreshCw className="h-3.5 w-3.5" /></Button>
          </div>
          <p className="mt-2 text-base font-semibold">{order.cargoNumber || "Yuk No Yok"}{order.tripNumber ? ` / ${order.tripNumber}` : ""}</p>
          <div className="mt-1 mb-1">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              order.jobType === "UNLOADING"
                ? "bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/30"
                : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30"
            }`}>
              {order.jobType === "UNLOADING" ? "Bosaltma Isi" : "Yukleme Isi"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {order.vehicle && <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {order.vehicle.plateNumber}</span>}
            {order.routeText && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {order.routeText}</span>}
          </div>
          {(order.loadingAddress || order.deliveryAddress) && (() => {
            const showLoading =
              nextStep?.eventType === "LOAD" ||
              (nextStep?.eventType === "START_JOB" && order.jobType !== "UNLOADING") ||
              (!nextStep && order.jobType === "LOADING");
            const addr = showLoading ? order.loadingAddress : order.deliveryAddress;
            const label = showLoading ? "Yukleme Adresi" : "Teslim / Bosaltma Adresi";
            const badge = showLoading
              ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
              : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300";
            const letter = showLoading ? "Y" : "T";
            if (!addr) return null;
            return (
              <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${badge}`}>{letter}</span>
                  <div><p className="font-medium text-foreground/80">{label}</p><p className="text-muted-foreground">{addr}</p></div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Warnings */}

      {/* Operation Flow */}
      <Card>
        <CardHeader className="pb-2 px-3.5 pt-3.5"><CardTitle className="text-sm">Operasyon Adimlari</CardTitle></CardHeader>
        <CardContent className="px-3.5 pb-3.5">
          <div className="space-y-2">
            {activeFlow.map((step, idx) => {
              const done = isStepDone(step);
              const photoOk = isStepPhotoOk(step);
              const isNext = nextStep?.eventType === step.eventType;
              const Icon = step.icon;

              return (
                <div key={step.eventType} className={`rounded-lg border p-2.5 transition-colors ${done ? "border-emerald-500/30 bg-emerald-500/5" : isNext && !isCompleted ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${done ? "bg-emerald-500 text-white" : isNext && !isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2"><Icon className="h-3.5 w-3.5" /><span className="text-sm font-medium">{step.label}</span></div>
                      {done && (
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          {step.requiresPhoto && <span className={photoOk ? "text-emerald-600" : "text-amber-600"}>{photoOk ? "✓ Foto" : "✗ Foto eksik"}</span>}
                        </div>
                      )}
                    </div>
                    {isNext && !isCompleted && <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">Aktif</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {nextStep && !isCompleted && (
            <div className="mt-3 space-y-2.5 border-t pt-3" key={phaseFormKey}>
              {/* Office-provided phase location */}
              {nextStep.phaseLocationKey && order[nextStep.phaseLocationKey] && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-2.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-300" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">Ofis Konumu</p>
                    <p className="text-xs text-foreground">{order[nextStep.phaseLocationKey]}</p>
                  </div>
                </div>
              )}
              {/* Photo inputs */}
              {nextStep.photoLabels ? (
                <div className="space-y-2">
                  {nextStep.photoLabels.map((p) => (
                    <div key={p.key}>
                      <Label className="text-xs mb-1 block">{p.label}{p.required ? " *" : " (opsiyonel)"}</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="h-9 text-xs"
                        onChange={(e) => setPhasePhotos((prev) => ({ ...prev, [p.key]: e.target.files?.[0] ?? null }))}
                      />
                      {phasePhotos[p.key] && <p className="text-[10px] text-emerald-600 mt-0.5">{phasePhotos[p.key]!.name} ({(phasePhotos[p.key]!.size / 1024).toFixed(0)} KB)</p>}
                    </div>
                  ))}
                </div>
              ) : nextStep.requiresPhoto && (
                <div>
                  <Label className="text-xs mb-1 block">Fotoğraf *</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="h-9 text-xs"
                    onChange={(e) => setPhasePhotos((prev) => ({ ...prev, genel: e.target.files?.[0] ?? null }))}
                  />
                </div>
              )}
              {/* Structured data fields */}
              {nextStep.dataFields && nextStep.dataFields.length > 0 && (
                <div className="space-y-2">
                  {nextStep.dataFields.map((f) => (
                    <div key={f.key}>
                      <Label className="text-xs mb-1 block">{f.label}</Label>
                      {f.type === "text" ? (
                        <Textarea
                          placeholder={f.label}
                          value={phaseInputs[f.key] ?? ""}
                          onChange={(e) => setPhaseInputs((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          className="min-h-[60px] text-sm"
                        />
                      ) : (
                        <Input
                          type="number"
                          placeholder="0"
                          value={phaseInputs[f.key] ?? ""}
                          onChange={(e) => setPhaseInputs((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          className="h-9 text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              <Input placeholder="Kilometre (opsiyonel)" type="number" value={eventKm} onChange={(e) => setEventKm(e.target.value)} className="h-9 text-sm" />
              <Textarea placeholder="Genel not (opsiyonel)" value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} className="min-h-[60px] text-sm" />
              <Button className="w-full h-9 text-sm" onClick={() => executeFlowStep(nextStep)} disabled={submitting}>
                {submitting ? "Kaydediliyor..." : nextStep.label}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {!isCompleted && (
        <div className="grid grid-cols-2 gap-2">
          <ActionButton icon={Camera} label="Fotograf Yukle" active={activeSection === "photo"} onClick={() => setActiveSection(activeSection === "photo" ? null : "photo")} />
          <ActionButton icon={Timer} label="Bekleme / Sorun" active={activeSection === "issue"} onClick={() => setActiveSection(activeSection === "issue" ? null : "issue")} />
          <ActionButton icon={ArrowRightLeft} label="Devir Teslim" active={activeSection === "handover"} onClick={() => setActiveSection(activeSection === "handover" ? null : "handover")} />
        </div>
      )}

      {/* Photo upload */}
      {activeSection === "photo" && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2 px-3.5 pt-3.5"><CardTitle className="text-sm flex items-center gap-2"><Camera className="h-4 w-4" /> Fotograf Yukle</CardTitle></CardHeader>
          <CardContent className="px-3.5 pb-3.5 space-y-2.5">
            <div>
              <Label className="text-xs">Hangi adim icin?</Label>
              <Select value={uploadEventId} onValueChange={setUploadEventId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Event sec" /></SelectTrigger>
                <SelectContent>
                  {order.driverEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {EVENT_LABELS[event.type] ?? event.type} - {new Date(event.eventAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Etiket (opsiyonel)" value={uploadLabel} onChange={(e) => setUploadLabel(e.target.value)} className="h-9 text-sm" />
            <Input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} className="text-sm" />
            {uploadFile && <p className="text-xs text-muted-foreground">Secilen: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)</p>}
            <Button className="w-full h-9 text-sm" onClick={uploadPhoto} disabled={submitting || !uploadFile}><Upload className="mr-1.5 h-3.5 w-3.5" />{submitting ? "Yukleniyor..." : "Yukle"}</Button>
          </CardContent>
        </Card>
      )}

      {/* Issue / Waiting */}
      {activeSection === "issue" && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2 px-3.5 pt-3.5"><CardTitle className="text-sm flex items-center gap-2"><CircleAlert className="h-4 w-4" /> Bekleme / Sorun Bildirimi</CardTitle></CardHeader>
          <CardContent className="px-3.5 pb-3.5 space-y-2.5">
            <Select value={advancedEventType} onValueChange={(v) => setAdvancedEventType(v as EventType)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="WAITING">Bekleme</SelectItem>
                <SelectItem value="ISSUE">Sorun Bildirimi</SelectItem>
                <SelectItem value="UNLOAD">Bosaltma</SelectItem>
                <SelectItem value="START_SHIFT">Vardiya Baslat</SelectItem>
                <SelectItem value="END_SHIFT">Vardiya Bitir</SelectItem>
              </SelectContent>
            </Select>
            <Select value={advancedSeverity} onValueChange={(v) => setAdvancedSeverity(v as "NORMAL" | "WARNING" | "CRITICAL")}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="WARNING">Uyari</SelectItem>
                <SelectItem value="CRITICAL">Kritik</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Aciklama (zorunlu)" value={eventNotes} onChange={(e) => setEventNotes(e.target.value)} className="min-h-[60px] text-sm" />
            <Input placeholder="Kilometre (opsiyonel)" type="number" value={eventKm} onChange={(e) => setEventKm(e.target.value)} className="h-9 text-sm" />
            <Button className="w-full h-9 text-sm" variant="outline" onClick={createAdvancedEvent} disabled={submitting}>{submitting ? "Kaydediliyor..." : "Kaydet"}</Button>
          </CardContent>
        </Card>
      )}

      {/* Handover */}
      {activeSection === "handover" && (
        <Card className="border-blue-500/30">
          <CardHeader className="pb-2 px-3.5 pt-3.5"><CardTitle className="text-sm flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Devir Teslim</CardTitle></CardHeader>
          <CardContent className="px-3.5 pb-3.5 space-y-2.5">
            <div>
              <Label className="text-xs">Devir alacak surucu (opsiyonel)</Label>
              <Select value={handoverToDriverId} onValueChange={setHandoverToDriverId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Surucu sec" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Belirtilmedi</SelectItem>
                  {availableDrivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Textarea placeholder="Devir notu" value={handoverNotes} onChange={(e) => setHandoverNotes(e.target.value)} className="min-h-[60px] text-sm" />
            <Button className="w-full h-9 text-sm" variant="outline" onClick={createHandover} disabled={submitting}><Hand className="mr-1.5 h-3.5 w-3.5" />{submitting ? "Kaydediliyor..." : "Devir Teslim Kaydet"}</Button>
          </CardContent>
        </Card>
      )}

      {/* Event Timeline */}
      <Card>
        <CardHeader className="px-3.5 pt-3.5 pb-2"><CardTitle className="text-sm">Gecmis Aksiyonlar ({order.driverEvents.length})</CardTitle></CardHeader>
        <CardContent className="px-3.5 pb-3.5">
          {order.driverEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Henuz aksiyon yok.</p>
          ) : (
            <div className="relative space-y-0">
              {order.driverEvents.slice(0, 15).map((event, idx) => (
                <div key={event.id} className="relative pl-6 pb-3">
                  {idx < order.driverEvents.length - 1 && <div className="absolute left-[9px] top-4 bottom-0 w-px bg-border" />}
                  <div className={`absolute left-0 top-1 h-[18px] w-[18px] rounded-full border-2 ${event.severity === "CRITICAL" ? "border-red-500 bg-red-500/20" : event.severity === "WARNING" ? "border-amber-500 bg-amber-500/20" : "border-primary bg-primary/20"}`} />
                  <div className="text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{EVENT_LABELS[event.type] ?? event.type}</Badge>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{new Date(event.eventAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    {event.odometerKm && <p className="text-muted-foreground mt-0.5">{event.odometerKm} km</p>}
                    {event.notes && <p className="mt-0.5">{event.notes}</p>}
                    {event.photos.length > 0 && (
                      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                        {event.photos.map((photo) => (
                          <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded border">
                            <img src={photo.url} alt={photo.label || "Foto"} className="h-14 w-full object-cover" />
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

    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function ActionButton({ icon: Icon, label, active, onClick }: { icon: React.ElementType; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-colors ${active ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"}`}
    >
      <Icon className="h-4 w-4" />{label}
    </button>
  );
}
