"use client";

import { useEffect, useState } from "react";
import { Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Attachment } from "@/types";

interface AttachmentManagerProps {
  title: string;
  description: string;
  entityId: string;
  endpointBase: string;
  triggerLabel?: string;
  triggerClassName?: string;
  labelOptions?: string[];
  defaultLabel?: string;
}

export function AttachmentManager({
  title,
  description,
  entityId,
  endpointBase,
  triggerLabel = "Dosyalar",
  triggerClassName,
  labelOptions,
  defaultLabel,
}: AttachmentManagerProps) {
  const [open, setOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [label, setLabel] = useState(defaultLabel ?? "");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const presetOptions = Array.from(new Set((labelOptions ?? []).map((item) => item.trim()).filter(Boolean)));

  async function loadAttachments() {
    setLoading(true);
    try {
      const response = await fetch(`${endpointBase}/${entityId}/attachments`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Dosyalar alinamadi");
      }
      setAttachments(data.attachments ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dosyalar alinamadi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      void loadAttachments();
    }
  }, [open]);

  async function handleUpload() {
    if (!file) {
      toast.error("Yuklenecek dosya secin");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (label.trim()) formData.append("label", label.trim());
      if (expiryDate.trim()) formData.append("expiryDate", expiryDate.trim());

      const response = await fetch(`${endpointBase}/${entityId}/attachments`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Dosya yuklenemedi");
      }

      setLabel(defaultLabel ?? "");
      setExpiryDate("");
      setFile(null);
      toast.success("Dosya yuklendi");
      await loadAttachments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dosya yuklenemedi");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(attachmentId: string) {
    setDeletingId(attachmentId);
    try {
      const response = await fetch(`/api/attachments/${attachmentId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Dosya silinemedi");
      }

      toast.success("Dosya silindi");
      await loadAttachments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dosya silinemedi");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClassName ?? "gap-2"}>
          <Paperclip className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto_auto]">
          {presetOptions.length > 0 ? (
            <Select
              value={presetOptions.includes(label) ? label : "__custom__"}
              onValueChange={(value) => setLabel(value === "__custom__" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Hazir etiket secin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom__">Ozel etiket</SelectItem>
                {presetOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={presetOptions.length > 0 ? "Etiketi secin veya yazin" : "Dosya etiketi (opsiyonel)"}
            className={presetOptions.length === 0 ? "md:col-span-2" : undefined}
          />
          <div className="md:col-span-full grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Son Kullanma Tarihi (SKT)</p>
              <Input
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
                placeholder="SKT (opsiyonel)"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Dosya</p>
              <Input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            </div>
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="gap-2 md:col-span-full">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Yukle
          </Button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Dosyalar yukleniyor
            </div>
          ) : attachments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
              Henuz dosya eklenmedi.
            </div>
          ) : (
            attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
                <div className="min-w-0">
                  <a href={attachment.url} target="_blank" rel="noreferrer" className="truncate font-medium text-primary underline-offset-4 hover:underline">
                    {attachment.label || "Dosya"}
                  </a>
                  <div className="text-xs text-muted-foreground">
                    {attachment.mimeType || "Bilinmeyen tip"} · {(((attachment.size ?? 0) / 1024)).toFixed(1)} KB · {new Date(attachment.createdAt).toLocaleString("tr-TR")}
                    {(attachment as Attachment & { expiryDate?: string | null }).expiryDate && (
                      <span className="ml-2 font-medium text-amber-600">
                        SKT: {new Date((attachment as Attachment & { expiryDate: string }).expiryDate).toLocaleDateString("tr-TR")}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  disabled={deletingId === attachment.id}
                  onClick={() => handleDelete(attachment.id)}
                >
                  {deletingId === attachment.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}