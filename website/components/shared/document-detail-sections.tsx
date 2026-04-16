"use client";

import { FolderOpen, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentManager } from "@/components/shared/attachment-manager";
import { formatDocumentDate } from "@/lib/document-presets";
import type { AttachmentLike, DocumentStatus } from "@/lib/document-presets";

interface DocumentChecklistSectionProps {
  title: string;
  description?: string;
  items: DocumentStatus[];
  emptyLabel?: string;
  /** If provided, missing/warning items will show an inline upload button */
  entityId?: string;
  endpointBase?: string;
  labelOptions?: string[];
}

interface AttachmentListSectionProps {
  title: string;
  description?: string;
  attachments: Array<AttachmentLike & { mimeType?: string | null; size?: number | null; createdAt?: Date | null }>;
  emptyLabel: string;
}

export function DocumentChecklistSection({
  title,
  description,
  items,
  emptyLabel = "Belge tanimi bulunmuyor.",
  entityId,
  endpointBase,
  labelOptions,
}: DocumentChecklistSectionProps) {
  const canUpload = Boolean(entityId && endpointBase);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              return (
                <div key={item.label} className={`rounded-2xl border p-4 ${item.toneClassName}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.meta}</p>
                    </div>
                    <Badge variant={item.variant}>{item.statusLabel}</Badge>
                  </div>
                  {item.attachment ? (
                    <a
                      href={item.attachment.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 text-xs text-primary hover:underline"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      {item.attachment.label || `${item.label} dosyasi`}
                    </a>
                  ) : null}
                  {canUpload ? (
                    <div className="mt-3">
                      <AttachmentManager
                        title={`${item.label} Yukle`}
                        description={`${item.label} belgesini yukleyin.`}
                        entityId={entityId!}
                        endpointBase={endpointBase!}
                        triggerLabel={item.attachment ? "Guncelle" : "Ekle"}
                        triggerClassName="h-7 gap-1.5 text-xs px-2 border-current/30"
                        labelOptions={labelOptions}
                        defaultLabel={item.label}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AttachmentListSection({
  title,
  description,
  attachments,
  emptyLabel,
}: AttachmentListSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/40 p-4">
                <div className="min-w-0">
                  <a
                    href={attachment.url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span className="truncate">{attachment.label || "Etiketsiz dosya"}</span>
                  </a>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {attachment.mimeType || "Bilinmeyen tip"}
                    {attachment.size ? ` · ${(attachment.size / 1024).toFixed(1)} KB` : ""}
                    {attachment.createdAt ? ` · ${formatDocumentDate(attachment.createdAt)}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}