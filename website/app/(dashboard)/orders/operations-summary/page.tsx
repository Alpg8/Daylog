import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CarFront,
  CheckCircle2,
  FileText,
  FolderOpen,
  Package,
  PackageCheck,
  PackageOpen,
  Play,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { AttachmentManager } from "@/components/shared/attachment-manager";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationsSummaryFilters } from "@/components/orders/operations-summary-filters";
import { OpsSummaryRefresh } from "@/components/orders/ops-summary-refresh";

export const dynamic = "force-dynamic";

// ─── Constants ───────────────────────────────────────────────────────────────

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Beklemede",
  PLANNED: "Planli",
  IN_PROGRESS: "Devam Ediyor",
  COMPLETED: "Tamamlandi",
  CANCELLED: "Iptal",
};

const ORDER_STATUS_VARIANTS: Record<string, "warning" | "info" | "default" | "success" | "destructive"> = {
  PENDING: "warning",
  PLANNED: "info",
  IN_PROGRESS: "default",
  COMPLETED: "success",
  CANCELLED: "destructive",
};

const PHASE_ATTACHMENT_KEYWORDS = {
  START: ["baslangic", "baslama", "start", "cikis", "hareket"],
  LOAD: ["yukleme", "load", "cmr", "kantar", "yuklenme", "bosaltma", "unload", "smr"],
  DELIVERY: ["teslim", "delivery", "fatura", "invoice", "bitis", "son", "masraf"],
} as const;

type PhaseKey = "START" | "LOAD" | "DELIVERY";

// ─── Types ───────────────────────────────────────────────────────────────────

type OrderSummary = Awaited<ReturnType<typeof getOrderSummaries>>[number];
type AttachmentItem = OrderSummary["attachments"][number];
type DriverRecord = NonNullable<OrderSummary["driver"]>;
type VehicleRecord = NonNullable<OrderSummary["vehicle"]>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/\u0131/g, "i")
    .replace(/\u011f/g, "g")
    .replace(/\xfc/g, "u")
    .replace(/\u015f/g, "s")
    .replace(/\xf6/g, "o")
    .replace(/\xe7/g, "c");
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "Tarih yok";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(value);
}

function getRelativeDayLabel(value: Date | null | undefined) {
  if (!value) return null;
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const diffInDays = Math.ceil((target.getTime() - current.getTime()) / 86400000);
  if (diffInDays < 0) return `${Math.abs(diffInDays)} gun gecmis`;
  if (diffInDays === 0) return "Bugun son gun";
  return `${diffInDays} gun kaldi`;
}

function findMatchingAttachment(attachments: AttachmentItem[], keywords: readonly string[]) {
  return (
    attachments.find((attachment) => {
      const haystack = normalizeText([attachment.label, attachment.key, attachment.url].filter(Boolean).join(" "));
      return keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
    }) ?? null
  );
}

function summarizeDocument(label: string, attachment: AttachmentItem | null, expiryDate?: Date | null) {
  const relativeLabel = getRelativeDayLabel(expiryDate);
  if (expiryDate && expiryDate.getTime() < Date.now()) {
    return { label, attachment, expiryDate, statusLabel: "Suresi doldu", variant: "destructive" as const, tone: "border-red-500/20 bg-red-500/5", meta: relativeLabel };
  }
  if (expiryDate && relativeLabel) {
    const distance = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
    if (distance <= 30) {
      return { label, attachment, expiryDate, statusLabel: attachment ? "Yenileme yaklasti" : "Dosya eksik", variant: "warning" as const, tone: "border-amber-500/20 bg-amber-500/5", meta: relativeLabel };
    }
  }
  if (!attachment && expiryDate) {
    return { label, attachment, expiryDate, statusLabel: "Dosya yok", variant: "warning" as const, tone: "border-amber-500/20 bg-amber-500/5", meta: relativeLabel };
  }
  if (attachment && expiryDate) {
    return { label, attachment, expiryDate, statusLabel: "Hazir", variant: "success" as const, tone: "border-emerald-500/20 bg-emerald-500/5", meta: relativeLabel };
  }
  if (attachment) {
    return { label, attachment, expiryDate, statusLabel: "Dosya var", variant: "success" as const, tone: "border-emerald-500/20 bg-emerald-500/5", meta: attachment.label ?? "Etiket yok" };
  }
  return { label, attachment, expiryDate, statusLabel: "Eksik", variant: "destructive" as const, tone: "border-red-500/20 bg-red-500/5", meta: "Dosya yuklenmemis" };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildDriverDocuments(driver: DriverRecord | null) {
  if (!driver) return [];
  const docs = [
    { label: "Pasaport", keywords: ["pasaport", "passport"], dateField: "passportExpiryDate" as const },
    { label: "Ehliyet", keywords: ["ehliyet", "license", "licence"], dateField: "licenseExpiryDate" as const },
    { label: "Psikoteknik", keywords: ["psikoteknik", "psychotechnic"], dateField: "psychotechnicExpiryDate" as const },
    { label: "SRC", keywords: ["src"] },
    { label: "Vize", keywords: ["vize", "visa"] },
  ];
  return docs.map((document) => {
    const attachment = findMatchingAttachment(driver.attachments, document.keywords);
    const expiryDate = "dateField" in document ? driver[document.dateField as "passportExpiryDate" | "licenseExpiryDate" | "psychotechnicExpiryDate"] : null;
    return summarizeDocument(document.label, attachment, expiryDate);
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildVehicleDocuments(vehicle: VehicleRecord | null) {
  if (!vehicle) return [];
  const docs = [
    { label: "Kasko", keywords: ["kasko", "casko"] },
    { label: "Muayene", keywords: ["muayene", "inspection"] },
    { label: "Roder", keywords: ["roder", "ro-ro", "roro"] },
    { label: "Trafik Sigortasi", keywords: ["trafik sigortasi", "traffic insurance"] },
    { label: "Tako", keywords: ["tako", "takograf", "tachograph"] },
    { label: "Egzoz", keywords: ["egzoz", "emisyon", "exhaust"] },
  ];
  return docs.map((document) => {
    const attachment = findMatchingAttachment(vehicle.attachments, document.keywords);
    return summarizeDocument(document.label, attachment, null);
  });
}

function renderAttachmentList(attachments: AttachmentItem[], emptyLabel: string) {
  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.slice(0, 6).map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-foreground/85 transition-colors hover:border-primary/40 hover:text-primary"
        >
          <FolderOpen className="h-3.5 w-3.5" />
          {attachment.label || "Etiketsiz dosya"}
        </a>
      ))}
      {attachments.length > 6 && <Badge variant="outline">+{attachments.length - 6} ek dosya</Badge>}
    </div>
  );
}

// ─── Data fetching ────────────────────────────────────────────────────────────

interface Filters {
  month?: string; // YYYY-MM or undefined = all time
  status?: string;
  category?: string;
  driverId?: string;
  vehicleId?: string;
}

async function getOrderSummaries(filters: Filters) {
  const where: Record<string, unknown> = {};

  if (filters.month && filters.month !== "ALL") {
    const [year, mon] = filters.month.split("-").map(Number);
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd = new Date(year, mon, 1);
    where.OR = [
      { operationDate: { gte: monthStart, lt: monthEnd } },
      { loadingDate: { gte: monthStart, lt: monthEnd } },
      // Also include orders with no dates set so they always appear
      { operationDate: null, loadingDate: null },
    ];
  }

  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.category && filters.category !== "ALL") where.orderCategory = filters.category;
  if (filters.driverId && filters.driverId !== "ALL") where.driverId = filters.driverId;
  if (filters.vehicleId && filters.vehicleId !== "ALL") where.vehicleId = filters.vehicleId;

  return prisma.order.findMany({
    where,
    orderBy: [{ operationDate: "desc" }, { loadingDate: "desc" }, { updatedAt: "desc" }],
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      vehicle: { include: { attachments: { orderBy: { createdAt: "desc" } } } },
      trailer: { include: { attachments: { orderBy: { createdAt: "desc" } } } },
      driver: { include: { attachments: { orderBy: { createdAt: "desc" } } } },
      driverEvents: {
        where: { OR: [{ photos: { some: {} } }, { notes: { not: null } }] },
        orderBy: { eventAt: "desc" },
        take: 20,
        include: {
          photos: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, url: true, label: true, note: true } },
          driver: { select: { fullName: true } },
        },
      },
      _count: { select: { attachments: true, driverEvents: true, driverConfirmations: true } },
    },
  });
}

async function getFilterOptions() {
  const [drivers, vehicles] = await Promise.all([
    prisma.driver.findMany({ where: { isActive: true }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
    prisma.vehicle.findMany({ where: { status: { not: "PASSIVE" } }, select: { id: true, plateNumber: true }, orderBy: { plateNumber: "asc" } }),
  ]);
  return { drivers, vehicles };
}

function defaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function OrderOperationsSummaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const filters: Filters = {
    month: params.month, // undefined = all time (no month filter)
    status: params.status,
    category: params.category,
    driverId: params.driverId,
    vehicleId: params.vehicleId,
  };

  const [orders, { drivers, vehicles }] = await Promise.all([
    getOrderSummaries(filters),
    getFilterOptions(),
  ]);

  const aggregates = orders.reduce(
    (s, order) => {
      if (order.attachments.length === 0) s.ordersWithoutFiles += 1;
      if (!order.vehicle) s.ordersWithoutVehicle += 1;
      return s;
    },
    { ordersWithoutFiles: 0, ordersWithoutVehicle: 0 }
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Operasyon Evrak Ozeti"
        description="Siparislerde operasyon akisini, surucu evraklarini ve arac dosyalarini tek ekranda takip edin."
        actions={
          <div className="flex items-center gap-2">
            <OpsSummaryRefresh />
            <Button asChild variant="outline">
              <Link href="/orders">Tum siparislere don</Link>
            </Button>
          </div>
        }
      />

      <OperationsSummaryFilters drivers={drivers} vehicles={vehicles} defaultMonth={defaultMonth()} />

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{orders.length}</p>
              <p className="text-xs text-muted-foreground">Toplam siparis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{orders.filter((o) => o.status === "IN_PROGRESS").length}</p>
              <p className="text-xs text-muted-foreground">Devam eden</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{aggregates.ordersWithoutVehicle}</p>
              <p className="text-xs text-muted-foreground">Arac atanmamis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{aggregates.ordersWithoutFiles}</p>
              <p className="text-xs text-muted-foreground">Dosya eksik</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            Secilen filtrelerde siparis bulunamadi.
          </CardContent>
        </Card>
      ) : (
        orders.map((order) => {
          type EvType = typeof order.driverEvents[number];

          const PHASES: Array<{ key: PhaseKey; label: string; icon: React.ReactNode; types: string[] }> = [
            { key: "START",    label: "Baslangic",          icon: <Play className="h-4 w-4" />,         types: ["START_JOB"] },
            { key: "LOAD",     label: "Yukleme / Bosaltma", icon: <PackageOpen className="h-4 w-4" />,  types: ["LOAD", "UNLOAD"] },
            { key: "DELIVERY", label: "Teslim / Bitis",     icon: <PackageCheck className="h-4 w-4" />, types: ["DELIVERY", "END_JOB"] },
          ];

          const matchedIds = new Set<string>();
          const phaseAttachments = Object.fromEntries(
            PHASES.map((phase) => {
              const hits = order.attachments.filter((a) =>
                PHASE_ATTACHMENT_KEYWORDS[phase.key].some((kw) =>
                  normalizeText(a.label).includes(normalizeText(kw))
                )
              );
              hits.forEach((a) => matchedIds.add(a.id));
              return [phase.key, hits];
            })
          ) as Record<PhaseKey, typeof order.attachments>;

          const allPhaseKws = [...PHASE_ATTACHMENT_KEYWORDS.START, ...PHASE_ATTACHMENT_KEYWORDS.LOAD, ...PHASE_ATTACHMENT_KEYWORDS.DELIVERY];
          const otherAttachments = order.attachments.filter(
            (a) => !allPhaseKws.some((kw) => normalizeText(a.label).includes(normalizeText(kw)))
          );

          return (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="gap-3 border-b border-border/60 bg-background/40 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl">
                      {order.cargoNumber || order.tripNumber || order.referenceNumber || "Numarasiz Siparis"}
                    </CardTitle>
                    <Badge variant={ORDER_STATUS_VARIANTS[order.status] ?? "outline"}>
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                    <Badge variant="outline">{order.orderCategory}</Badge>
                  </div>
                  <CardDescription>{order.routeText || "Guzergah girilmemis"}</CardDescription>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Musteri: {order.customerName || "\u2014"}</span>
                    <span>Yukleme: {formatDate(order.loadingDate)}</span>
                    <span>Bosaltma: {formatDate(order.unloadingDate)}</span>
                    <span>Operasyon: {formatDate(order.operationDate)}</span>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/orders/${order.id}`}>Operasyon detayi</Link>
                </Button>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                <div className="grid gap-3 lg:grid-cols-3">
                  <div className="space-y-4 rounded-2xl border border-border/60 bg-background/30 p-4">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">Operasyon Bilgileri</h3>
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2">
                        <span>Cekici</span>
                        <span className="font-medium text-foreground">{order.vehicle?.plateNumber || "Atanmadi"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2">
                        <span>Dorse</span>
                        <span className="font-medium text-foreground">{order.trailer?.plateNumber || "Atanmadi"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-3 py-2">
                        <span>Surucu</span>
                        <span className="font-medium text-foreground">
                          {order.driver ? (
                            <Link href={`/drivers/${order.driver.id}`} className="text-primary hover:underline">
                              {order.driver.fullName}
                            </Link>
                          ) : "Atanmadi"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{order._count.driverEvents} event</Badge>
                      <Badge variant="outline">{order._count.driverConfirmations} onam</Badge>
                    </div>
                  </div>

                  {order.vehicle ? (
                    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/30 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CarFront className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-semibold">{order.vehicle.plateNumber}</p>
                            <p className="text-xs text-muted-foreground">{[order.vehicle.brand, order.vehicle.model].filter(Boolean).join(" ") || "Cekici"}</p>
                          </div>
                        </div>
                        <AttachmentManager title="Arac dosyalari" description="Kasko, sigorta ve teknik belge dosyalarini yonetin."
                          entityId={order.vehicle.id} endpointBase="/api/vehicles" triggerLabel="Dosya ekle" triggerClassName="h-8 gap-2" />
                      </div>
                      {renderAttachmentList(order.vehicle.attachments, "Araca bagli dosya yok.")}
                    </div>
                  ) : null}

                  {order.trailer ? (
                    <div className="space-y-3 rounded-2xl border border-border/60 bg-background/30 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CarFront className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-semibold">{order.trailer.plateNumber}</p>
                            <p className="text-xs text-muted-foreground">{order.trailer.type ? `Dorse \u00b7 ${order.trailer.type}` : "Dorse"}</p>
                          </div>
                        </div>
                        <AttachmentManager title="Dorse dosyalari" description="Dorseye ait ilgili operasyon dosyalarini yonetin."
                          entityId={order.trailer.id} endpointBase="/api/trailers" triggerLabel="Dosya ekle" triggerClassName="h-8 gap-2" />
                      </div>
                      {renderAttachmentList(order.trailer.attachments, "Dorseye bagli dosya yok.")}
                    </div>
                  ) : null}

                  {!order.vehicle && !order.trailer && (
                    <div className="col-span-2 flex items-center rounded-2xl border border-border/60 bg-background/30 p-4 text-sm text-muted-foreground">
                      Arac veya dorse atanmamis.
                    </div>
                  )}
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  {PHASES.map((phase) => {
                    const events = order.driverEvents.filter((e) => phase.types.includes(e.type));
                    const attachments = phaseAttachments[phase.key];
                    const isEmpty = events.length === 0 && attachments.length === 0;
                    return (
                      <div key={phase.key} className="space-y-3 rounded-2xl border border-border/60 bg-background/30 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-semibold">
                            <span className="text-primary">{phase.icon}</span>
                            {phase.label}
                          </div>
                          <AttachmentManager title="Siparis dosyalari" description="CMR, fatura ve siparis belgelerini yonetin."
                            entityId={order.id} endpointBase="/api/orders" triggerLabel="Dosya ekle" triggerClassName="h-7 gap-1.5 text-xs" />
                        </div>

                        {attachments.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Evraklar</p>
                            <div className="flex flex-wrap gap-1.5">
                              {attachments.map((attachment) => (
                                <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs text-foreground/85 transition-colors hover:border-primary/40 hover:text-primary">
                                  <FolderOpen className="h-3 w-3" />
                                  {attachment.label || "Etiketsiz dosya"}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {events.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Surucu Kayitlari</p>
                            {events.map((event: EvType) => (
                              <div key={event.id} className="rounded-xl border border-border/40 bg-background/60 p-2.5 text-xs">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <span className="font-medium text-foreground/80">{event.driver.fullName}</span>
                                  <span className="text-muted-foreground">
                                    {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(event.eventAt))}
                                  </span>
                                </div>
                                {event.notes && <p className="mb-2 italic text-muted-foreground">&ldquo;{event.notes}&rdquo;</p>}
                                {event.photos.length > 0 && (
                                  <div className="grid grid-cols-3 gap-1.5">
                                    {event.photos.map((photo) => {
                                      // Proxy R2 images through our server to avoid cross-origin/public-access issues
                                      const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "https://pub-60c1b097ea13484f9c04938288582747.r2.dev";
                                      const proxyUrl = photo.url.startsWith(r2PublicUrl)
                                        ? `/api/r2-image?key=${encodeURIComponent(photo.url.slice(r2PublicUrl.length + 1))}`
                                        : photo.url;
                                      return (
                                      <a key={photo.id} href={proxyUrl} target="_blank" rel="noreferrer"
                                        className="group relative block overflow-hidden rounded-lg border border-border/50 bg-muted">
                                        <div className="aspect-square">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={proxyUrl}
                                            alt={photo.label || "Foto"}
                                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                          />
                                        </div>
                                        <div className="px-1.5 py-1">
                                          {photo.label && (
                                            <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{photo.label}</p>
                                          )}
                                          {(photo as typeof photo & { note?: string | null }).note && (
                                            <p className="mt-0.5 text-[10px] italic text-foreground/70 line-clamp-2">{(photo as typeof photo & { note?: string | null }).note}</p>
                                          )}
                                        </div>
                                      </a>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {isEmpty && <p className="text-xs italic text-muted-foreground">Henuz kayit veya evrak yok</p>}
                      </div>
                    );
                  })}
                </div>

                {otherAttachments.length > 0 && (
                  <div className="rounded-2xl border border-border/60 bg-background/30 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">Diger Evraklar</h3>
                    </div>
                    {renderAttachmentList(otherAttachments, "")}
                  </div>
                )}
              </CardContent>

              <div className="flex items-center gap-3 border-t border-border/60 px-5 py-4 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                Son guncelleme: {formatDate(order.updatedAt)}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
