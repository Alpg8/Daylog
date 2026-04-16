"use client";

import React, { useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface InlineNotesEditorProps {
  entityId: string;
  endpointBase: string; // e.g. "/api/drivers"
  initialValue: string | null;
  placeholder?: string;
  label?: string;
}

export function InlineNotesEditor({
  entityId,
  endpointBase,
  initialValue,
  placeholder = "Not girilmemiş.",
  label = "Notlar",
}: InlineNotesEditorProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    setValue(initialValue ?? "");
    setError(null);
    setEditing(false);
  }

  async function handleSave() {
    setError(null);
    try {
      const res = await fetch(`${endpointBase}/${entityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Kayıt başarısız.");
        return;
      }
      setEditing(false);
      startTransition(() => router.refresh());
    } catch {
      setError("Sunucuya bağlanılamadı.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Düzenle
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Not ekleyin…"
            rows={3}
            className="resize-none text-sm"
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={handleSave} disabled={isPending}>
              <Check className="h-3.5 w-3.5" />
              Kaydet
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCancel} disabled={isPending}>
              <X className="h-3.5 w-3.5" />
              İptal
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {initialValue || placeholder}
        </p>
      )}
    </div>
  );
}
