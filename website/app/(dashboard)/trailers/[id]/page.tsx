import Link from "next/link";
import { notFound } from "next/navigation";
import { AttachmentManager } from "@/components/shared/attachment-manager";
import { AttachmentListSection, DocumentChecklistSection } from "@/components/shared/document-detail-sections";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { InlineNotesEditor } from "@/components/shared/inline-notes-editor";
import { TrailerEditDialog } from "@/components/trailers/trailer-edit-dialog";
import {
  buildDocumentStatuses,
  formatDocumentDate,
  TRAILER_ATTACHMENT_LABEL_OPTIONS,
  TRAILER_DOCUMENT_DEFINITIONS,
} from "@/lib/document-presets";

export const dynamic = "force-dynamic";

export default async function TrailerDetailPage({ params }: { params: { id: string } }) {
  const trailer = await prisma.trailer.findUnique({
    where: { id: params.id },
    include: {
      attachments: { orderBy: { createdAt: "desc" } },
      orders: {
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { driver: true, vehicle: true },
      },
    },
  });

  if (!trailer) notFound();

  const documents = buildDocumentStatuses(TRAILER_DOCUMENT_DEFINITIONS, trailer.attachments, trailer);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dorse Detay"
        description="Dorseye ait evraklari ve son operasyon baglantilarini yonetin."
        actions={
          <div className="flex items-center gap-2">            <TrailerEditDialog trailer={trailer} />            <AttachmentManager
              title={`${trailer.plateNumber} Dosyalari`}
              description="Dorse evraklarini hazir etiketlerden secerek veya ozel adla yukleyin."
              entityId={trailer.id}
              endpointBase="/api/trailers"
              triggerLabel="Dosya Yukle"
              labelOptions={TRAILER_ATTACHMENT_LABEL_OPTIONS}
            />
            <Button asChild variant="outline">
              <Link href="/trailers">Listeye don</Link>
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{trailer.plateNumber}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tip</p>
            <p className="mt-2 font-medium text-foreground">{trailer.type || "Belirtilmedi"}</p>
          </div>
          <div className="rounded-2xl border border-border/60 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Durum</p>
            <div className="mt-2"><Badge variant="info">{trailer.status}</Badge></div>
          </div>
          <div className="rounded-2xl border border-border/60 p-4 col-span-3">
            <InlineNotesEditor
              entityId={trailer.id}
              endpointBase="/api/trailers"
              initialValue={trailer.notes}
              placeholder="Bu dorse için henüz not girilmemiş."
            />
          </div>
        </CardContent>
      </Card>

      <DocumentChecklistSection
        title="Dorse Evraklari"
        description="Ruhsat, muayene, sigorta ve diger dorse belgelerini takip edin."
        items={documents}
        entityId={trailer.id}
        endpointBase="/api/trailers"
        labelOptions={TRAILER_ATTACHMENT_LABEL_OPTIONS}
      />

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <AttachmentListSection
          title="Yuklu Dosyalar"
          description="Dorseye bagli tum yuklu dosyalar"
          attachments={trailer.attachments}
          emptyLabel="Bu dorse icin henuz dosya yuklenmemis."
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Son Isler</CardTitle>
          </CardHeader>
          <CardContent>
            {trailer.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu dorseye bagli yakin tarihli is yok.</p>
            ) : (
              <div className="space-y-3">
                {trailer.orders.map((order) => (
                  <div key={order.id} className="rounded-2xl border border-border/60 p-4">
                    <p className="font-medium text-foreground">{order.cargoNumber || order.tripNumber || "Numarasiz Is"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{order.driver?.fullName || "Surucu atanmamis"} · {order.vehicle?.plateNumber || "Arac atanmamis"}</p>
                    <div className="mt-3 flex gap-2">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/orders/${order.id}`}>Is Detay</Link>
                      </Button>
                      <span className="text-xs text-muted-foreground self-center">{formatDocumentDate(order.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}