import Link from "next/link";
import { notFound } from "next/navigation";
import { CarFront, Users } from "lucide-react";
import { AttachmentManager } from "@/components/shared/attachment-manager";
import { AttachmentListSection, DocumentChecklistSection } from "@/components/shared/document-detail-sections";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import {
  buildDocumentStatuses,
  formatDocumentDate,
  VEHICLE_ATTACHMENT_LABEL_OPTIONS,
  VEHICLE_DOCUMENT_DEFINITIONS,
} from "@/lib/document-presets";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      drivers: true,
      orders: {
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { driver: true },
      },
    },
  });

  if (!vehicle) notFound();

  const documents = buildDocumentStatuses(VEHICLE_DOCUMENT_DEFINITIONS, vehicle.attachments, vehicle);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Arac Detay"
        description="Araca ait evraklari ve aktif kullanim baglantilarini tek ekranda yonetin."
        actions={
          <div className="flex items-center gap-2">
            <AttachmentManager
              title={`${vehicle.plateNumber} Dosyalari`}
              description="Arac evraklarini hazir etiketlerden secerek veya ozel adla yukleyin."
              entityId={vehicle.id}
              endpointBase="/api/vehicles"
              triggerLabel="Dosya Yukle"
              labelOptions={VEHICLE_ATTACHMENT_LABEL_OPTIONS}
            />
            <Button asChild variant="outline">
              <Link href="/vehicles">Listeye don</Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{vehicle.plateNumber}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Marka / Model</p>
            <p className="mt-2 font-medium text-foreground">{[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "Belirtilmedi"}</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Kullanim</p>
            <p className="mt-2 font-medium text-foreground">{vehicle.usageType || "Belirtilmedi"}</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Mulkiyet</p>
            <p className="mt-2 font-medium text-foreground">{vehicle.ownershipType || "Belirtilmedi"}</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Durum</p>
            <div className="mt-2"><Badge variant="info">{vehicle.status}</Badge></div>
          </div>
        </CardContent>
      </Card>

      <DocumentChecklistSection
        title="Arac Evraklari"
        description="Kasko, muayene, roder, trafik sigortasi, tako ve egzoz durumunu takip edin."
        items={documents}
        entityId={vehicle.id}
        endpointBase="/api/vehicles"
        labelOptions={VEHICLE_ATTACHMENT_LABEL_OPTIONS}
      />

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <AttachmentListSection
          title="Yuklu Dosyalar"
          description="Araca bagli tum yuklu dosyalar"
          attachments={vehicle.attachments}
          emptyLabel="Bu arac icin henuz dosya yuklenmemis."
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bagli Suruculer</CardTitle>
          </CardHeader>
          <CardContent>
            {vehicle.drivers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu araca bagli surucu yok.</p>
            ) : (
              <div className="space-y-3">
                {vehicle.drivers.map((driver) => (
                  <div key={driver.id} className="rounded-2xl border border-border/60 p-4">
                    <p className="flex items-center gap-2 font-medium text-foreground"><Users className="h-4 w-4" />{driver.fullName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{driver.phoneNumber || "Telefon yok"}</p>
                    <Button asChild variant="ghost" size="sm" className="mt-2 px-0">
                      <Link href={`/drivers/${driver.id}`}>Surucu Detay</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Son Isler</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicle.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu araca bagli yakin tarihli is yok.</p>
          ) : (
            <div className="space-y-3">
              {vehicle.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 p-4">
                  <div>
                    <p className="font-medium text-foreground">{order.cargoNumber || order.tripNumber || "Numarasiz Is"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{order.driver?.fullName || "Surucu atanmamis"} · {formatDocumentDate(order.updatedAt)}</p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/orders/${order.id}`}>Is Detay</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}