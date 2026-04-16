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
  UserSquare2,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { AttachmentManager } from "@/components/shared/attachment-manager";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

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

const DRIVER_DOCUMENTS = [
  { key: "passport", label: "Pasaport", keywords: ["pasaport", "passport"], dateField: "passportExpiryDate" },
  { key: "license", label: "Ehliyet", keywords: ["ehliyet", "license", "licence", "surucu belgesi"], dateField: "licenseExpiryDate" },
  { key: "psychotechnic", label: "Psikoteknik", keywords: ["psikoteknik", "psychotechnic"], dateField: "psychotechnicExpiryDate" },
  { key: "src", label: "SRC", keywords: ["src"] },
  { key: "visa", label: "Vize", keywords: ["vize", "visa"] },
] as const;

const VEHICLE_DOCUMENTS = [
  { key: "kasko", label: "Kasko", keywords: ["kasko", "casko"] },
  { key: "inspection", label: "Muayene", keywords: ["muayene", "inspection"] },
  { key: "roder", label: "Roder", keywords: ["roder", "ro-ro", "roro"] },
  { key: "trafficInsurance", label: "Trafik Sigortasi", keywords: ["trafik sigortasi", "traffic insurance", "zorunlu trafik"] },
  { key: "tako", label: "Tako", keywords: ["tako", "takograf", "tachograph"] },
  { key: "exhaust", label: "Egzoz", keywords: ["egzoz", "emisyon", "exhaust"] },
] as const;

type OrderSummary = Awaited<ReturnType<typeof getOrderSummaries>>[number];
type AttachmentItem = OrderSummary["attachments"][number];
type DriverRecord = NonNullable<OrderSummary["driver"]>;
type VehicleRecord = NonNullable<OrderSummary["vehicle"]>;

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
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
  return attachments.find((attachment) => {
    const haystack = normalizeText([attachment.label, attachment.key, attachment.url].filter(Boolean).join(" "));
    return keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
  }) ?? null;
}

function summarizeDocument(label: string, attachment: AttachmentItem | null, expiryDate?: Date | null) {
  const relativeLabel = getRelativeDayLabel(expiryDate);

  if (expiryDate && expiryDate.getTime() < Date.now()) {
    return {
      label,
      attachment,
      expiryDate,
      statusLabel: "Suresi doldu",
      variant: "destructive" as const,
      tone: "border-red-500/20 bg-red-500/5",
      meta: relativeLabel,
    };
  }

  if (expiryDate && relativeLabel) {
    const distance = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
    if (distance <= 30) {
      return {
        label,
        attachment,
        expiryDate,
        statusLabel: attachment ? "Yenileme yaklasti" : "Dosya eksik",
        variant: "warning" as const,
        tone: "border-amber-500/20 bg-amber-500/5",
        meta: relativeLabel,
      };
    }
  }

  if (!attachment && expiryDate) {
    return {
      label,
      attachment,
      expiryDate,
      statusLabel: "Dosya yok",
      variant: "warning" as const,
      tone: "border-amber-500/20 bg-amber-500/5",
      meta: relativeLabel,
    };
  }

  if (attachment && expiryDate) {
    return {
      label,
      attachment,
      expiryDate,
      statusLabel: "Hazir",
      variant: "success" as const,
      tone: "border-emerald-500/20 bg-emerald-500/5",
      meta: relativeLabel,
    };
  }

  if (attachment) {
    return {
      label,
      attachment,
      expiryDate,
      statusLabel: "Dosya var",
      variant: "success" as const,
      tone: "border-emerald-500/20 bg-emerald-500/5",
      meta: attachment.label ?? "Etiket yok",
    };
  }

  return {
    label,
    attachment,
    expiryDate,
    statusLabel: "Eksik",
    variant: "destructive" as const,
    tone: "border-red-500/20 bg-red-500/5",
    meta: "Dosya yuklenmemis",
  };
}

function buildDriverDocuments(driver: DriverRecord | null) {
  if (!driver) return [];

  return DRIVER_DOCUMENTS.map((document) => {
    const attachment = findMatchingAttachment(driver.attachments, document.keywords);
    const expiryDate = "dateField" in document ? driver[document.dateField] : null;
    return summarizeDocument(document.label, attachment, expiryDate);
  });
}

function buildVehicleDocuments(vehicle: VehicleRecord | null) {
  if (!vehicle) return [];

  return VEHICLE_DOCUMENTS.map((document) => {
    const attachment = findMatchingAttachment(vehicle.attachments, document.keywords);
    return summarizeDocument(document.label, attachment, null);
  });
}

function getMissingCount(items: Array<{ variant: string }>) {
  return items.filter((item) => item.variant === "destructive" || item.variant === "warning").length;
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

async function getOrderSummaries() {
  return prisma.order.findMany({
    where: {
      status: {
        in: ["PENDING", "PLANNED", "IN_PROGRESS"],
      },
    },
    orderBy: [{ operationDate: "desc" }, { updatedAt: "desc" }],
    take: 12,
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      vehicle: {
        include: {
          attachments: { orderBy: { createdAt: "desc" } },
        },
      },
      trailer: {
        include: {
          attachments: { orderBy: { createdAt: "desc" } },
        },
      },
      driver: {
        include: {
          attachments: { orderBy: { createdAt: "desc" } },
        },
      },
      driverEvents: {
        where: {
          OR: [
            { photos: { some: {} } },
            { notes: { not: null } },
          ],
        },
        orderBy: { eventAt: "desc" },
        take: 20,
        include: {
          photos: { orderBy: { createdAt: "desc" }, take: 10 },
          driver: { select: { fullName: true } },
        },
      },
      _count: {
        select: {
          attachments: true,
          driverEvents: true,
          driverConfirmations: true,
        },
      },
    },
  });
}

export default async function OrderOperationsSummaryPage() {
  const orders = await getOrderSummaries();

  const aggregates = orders.reduce(
    (summary, order) => {
      if (order.attachments.length === 0) summary.ordersWithoutFiles += 1;
      if (!order.vehicle) summary.ordersWithoutVehicle += 1;
      return summary;
    },
    { ordersWithoutFiles: 0, ordersWithoutVehicle: 0 }
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Operasyon Evrak Ozeti"
        description="Aktif siparislerde operasyon akisini, surucu evraklarini ve arac dosyalarini tek ekranda takip edin."
        actions={
          <Button asChild variant="outline">
            <Link href="/orders">Tum siparislere don</Link>
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{orders.length}</p>
              <p className="text-xs text-muted-foreground">Takip edilen aktif siparis</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <UserSquare2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{orders.filter((o) => !!o.driver).length}</p>
              <p className="text-xs text-muted-foreground">Surucu atanmis siparis</p>
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
              <p className="text-xs text-muted-foreground">Arac atanmamis siparis</p>
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
              <p className="text-xs text-muted-foreground">Siparis dosyasi eksik kayit</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">
            Su anda aktif siparis bulunmuyor. Yeni siparis planlandiginda bu ekranda otomatik gorunecek.
          </CardContent>
        </Card>
      ) : (
        orders.map((order) => {
          return (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="gap-3 border-b border-border/60 bg-background/40 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl">{order.cargoNumber || order.tripNumber || "Numarasiz Siparis"}</CardTitle>
                    <Badge variant={ORDER_STATUS_VARIANTS[order.status] ?? "outline"}>
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </Badge>
                    <Badge variant="outline">{order.orderCategory}</Badge>
                  </div>
                  <CardDescription>{order.routeText || "Guzergah girilmemis"}</CardDescription>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>Musteri: {order.customerName || "—"}</span>
                    <span>Yukleme: {formatDate(order.loadingDate)}</span>
                    <span>Bosaltma: {formatDate(order.unloadingDate)}</span>
                    <span>Operasyon: {formatDate(order.operationDate)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/orders/${order.id}`}>Operasyon detayi</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 p-5 lg:grid-cols-3">
                {/* Operasyonu gerceklestiren ekip */}
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

                {/* Siparis evraklari */}
                <div className="space-y-4 rounded-2xl border border-border/60 bg-background/30 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">Siparis Evraklari</h3>
                    </div>
                    <AttachmentManager
                      title="Siparis dosyalari"
                      description="CMR, fatura ve siparis belgelerini yonetin."
                      entityId={order.id}
                      endpointBase="/api/orders"
                      triggerLabel="Dosya ekle"
                      triggerClassName="h-8 gap-2"
                    />
                  </div>
                  <Badge variant={order._count.attachments > 0 ? "success" : "warning"}>
                    {order._count.attachments} siparis dosyasi
                  </Badge>
                  {renderAttachmentList(order.attachments, "Siparise belge yuklenmemis.")}
                </div>

                {/* Operasyon evraklari (arac + dorse) */}
                <div className="space-y-4 rounded-2xl border border-border/60 bg-background/30 p-4">
                  <div className="flex items-center gap-2">
                    <CarFront className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">Operasyon Evraklari</h3>
                  </div>
                  {order.vehicle && (
                    <div className="space-y-2 rounded-xl border border-border/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{order.vehicle.plateNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {[order.vehicle.brand, order.vehicle.model].filter(Boolean).join(" ") || "Cekici"}
                          </p>
                        </div>
                        <AttachmentManager
                          title="Arac dosyalari"
                          description="Kasko, sigorta ve teknik belge dosyalarini yonetin."
                          entityId={order.vehicle.id}
                          endpointBase="/api/vehicles"
                          triggerLabel="Dosya ekle"
                          triggerClassName="h-8 gap-2"
                        />
                      </div>
                      {renderAttachmentList(order.vehicle.attachments, "Araca bagli dosya yok.")}
                    </div>
                  )}
                  {order.trailer && (
                    <div className="space-y-2 rounded-xl border border-border/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{order.trailer.plateNumber}</p>
                          <p className="text-xs text-muted-foreground">{order.trailer.type ? `Dorse · ${order.trailer.type}` : "Dorse"}</p>
                        </div>
                        <AttachmentManager
                          title="Dorse dosyalari"
                          description="Dorseye ait ilgili operasyon dosyalarini yonetin."
                          entityId={order.trailer.id}
                          endpointBase="/api/trailers"
                          triggerLabel="Dosya ekle"
                          triggerClassName="h-8 gap-2"
                        />
                      </div>
                      {renderAttachmentList(order.trailer.attachments, "Dorseye bagli dosya yok.")}
                    </div>
                  )}
                  {!order.vehicle && !order.trailer && (
                    <p className="text-sm text-muted-foreground">Arac veya dorse atanmamis.</p>
                  )}

                  {/* Driver event photos and notes — grouped by 3 phases */}
                  {(() => {
                    type EvType = typeof order.driverEvents[number];
                    const PHASES: Array<{ label: string; icon: React.ReactNode; types: string[] }> = [
                      { label: "Baslama", icon: <Play className="h-3.5 w-3.5" />, types: ["START_JOB"] },
                      { label: "Yukleme / Bosaltma", icon: <PackageOpen className="h-3.5 w-3.5" />, types: ["LOAD", "UNLOAD"] },
                      { label: "Bitirme", icon: <CheckCircle2 className="h-3.5 w-3.5" />, types: ["DELIVERY", "END_JOB"] },
                    ];
                    const grouped = PHASES.map((phase) => ({
                      ...phase,
                      events: order.driverEvents.filter((e) => phase.types.includes(e.type)),
                    })).filter((g) => g.events.length > 0);
                    if (grouped.length === 0) return null;
                    return (
                      <div className="space-y-2 rounded-xl border border-border/50 p-3">
                        <p className="text-sm font-medium text-foreground">Is Asamalari</p>
                        <div className="space-y-3">
                          {grouped.map((group) => (
                            <div key={group.label}>
                              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
                                {group.icon}
                                {group.label}
                              </div>
                              <div className="space-y-1.5 pl-1">
                                {group.events.map((event: EvType) => (
                                  <div key={event.id} className="rounded-lg border border-border/40 bg-background/60 p-2 text-xs">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <span className="font-medium text-foreground/80">{event.driver.fullName}</span>
                                      <span className="text-muted-foreground">{new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(event.eventAt))}</span>
                                    </div>
                                    {event.notes && (
                                      <p className="text-muted-foreground mb-1.5 italic">&ldquo;{event.notes}&rdquo;</p>
                                    )}
                                    {event.photos.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {event.photos.map((photo) => (
                                          <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer"
                                            className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] hover:border-primary/50 hover:text-primary">
                                            <FileText className="h-3 w-3" />
                                            {photo.label || "foto"}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                    {!event.notes && event.photos.length === 0 && (
                                      <p className="text-muted-foreground">Foto veya not yok</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-4 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Son guncelleme: {formatDate(order.updatedAt)}
                  </span>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}