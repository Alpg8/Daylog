import Link from "next/link";
import { notFound } from "next/navigation";
import { CarFront, Phone } from "lucide-react";
import { AttachmentManager } from "@/components/shared/attachment-manager";
import { AttachmentListSection, DocumentChecklistSection } from "@/components/shared/document-detail-sections";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import {
  buildDocumentStatuses,
  DRIVER_ATTACHMENT_LABEL_OPTIONS,
  DRIVER_DOCUMENT_DEFINITIONS,
  formatDocumentDate,
} from "@/lib/document-presets";

export const dynamic = "force-dynamic";

export default async function DriverDetailPage({ params }: { params: { id: string } }) {
  const driver = await prisma.driver.findUnique({
    where: { id: params.id },
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      assignedVehicle: {
        include: {
          attachments: { orderBy: { createdAt: "desc" } },
        },
      },
      orders: {
        take: 5,
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!driver) notFound();

  const documents = buildDocumentStatuses(DRIVER_DOCUMENT_DEFINITIONS, driver.attachments, driver);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Surucu Detay"
        description="Surucuye ait kimlik, yetki ve operasyon dosyalarini buradan yonetin."
        actions={
          <div className="flex items-center gap-2">
            <AttachmentManager
              title={`${driver.fullName} Dosyalari`}
              description="Surucu belgelerini secilebilir veya ozel etiketlerle yukleyin."
              entityId={driver.id}
              endpointBase="/api/drivers"
              triggerLabel="Dosya Yukle"
              labelOptions={DRIVER_ATTACHMENT_LABEL_OPTIONS}
            />
            <Button asChild variant="outline">
              <Link href="/drivers">Listeye don</Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{driver.fullName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Telefon</p>
            <p className="mt-2 flex items-center gap-2 font-medium text-foreground">
              <Phone className="h-4 w-4" />
              {driver.phoneNumber || "Belirtilmedi"}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">TC Kimlik</p>
            <p className="mt-2 font-medium text-foreground">{driver.nationalId || "Belirtilmedi"}</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Kullanim</p>
            <p className="mt-2 font-medium text-foreground">{driver.usageType || "Belirtilmedi"}</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Durum</p>
            <div className="mt-2">
              <Badge variant={driver.isActive ? "success" : "secondary"}>{driver.isActive ? "Aktif" : "Pasif"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <DocumentChecklistSection
        title="Surucu Evraklari"
        description="Pasaport, ehliyet, psikoteknik, SRC ve vize durumunu izleyin."
        items={documents}
      />

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <AttachmentListSection
          title="Yuklu Dosyalar"
          description="Surucuye bagli tum yuklu dosyalar"
          attachments={driver.attachments}
          emptyLabel="Bu surucu icin henuz dosya yuklenmemis."
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bagli Arac</CardTitle>
          </CardHeader>
          <CardContent>
            {driver.assignedVehicle ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/60 p-4">
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    <CarFront className="h-4 w-4" />
                    {driver.assignedVehicle.plateNumber}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[driver.assignedVehicle.brand, driver.assignedVehicle.model].filter(Boolean).join(" ") || "Marka/model yok"}
                  </p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/vehicles/${driver.assignedVehicle.id}`}>Arac Detaya Git</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Bu surucuye atanmis arac bulunmuyor.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Son Isler</CardTitle>
        </CardHeader>
        <CardContent>
          {driver.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu surucuye bagli yakin tarihli is yok.</p>
          ) : (
            <div className="space-y-3">
              {driver.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 p-4">
                  <div>
                    <p className="font-medium text-foreground">{order.cargoNumber || order.tripNumber || "Numarasiz Is"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{order.routeText || "Guzergah yok"} · {formatDocumentDate(order.updatedAt)}</p>
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