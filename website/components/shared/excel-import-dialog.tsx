"use client";

import React, { useRef, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Loader2, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColumnMapping<T> {
  /** Excel'deki sütun başlığı(ları) — büyük/küçük harf duyarsız eşleşme */
  headers: string[];
  key: keyof T;
  label: string;
  required?: boolean;
  transform?: (value: string) => unknown;
}

interface ExcelImportDialogProps<T extends Record<string, unknown>> {
  title: string;
  endpoint: string;
  columns: ColumnMapping<T>[];
  templateFileName: string;
  /** Örnek satır — şablon indir butonu için */
  templateRow: Record<string, string>;
  onSuccess: () => void;
}

interface ParsedRow<T> {
  index: number;
  data: Partial<T>;
  errors: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizeHeader(h: string) {
  return h
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_\-]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function matchHeader(cellHeader: string, aliases: string[]): boolean {
  const norm = normalizeHeader(cellHeader);
  return aliases.some((a) => normalizeHeader(a) === norm);
}

function parseDate(raw: string | number | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const str = String(raw).trim();
  // DD.MM.YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, "0")}-${ddmmyyyy[1].padStart(2, "0")}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

// ─── TSV (clipboard) parser ───────────────────────────────────────────────────

function parseTsvToRows<T>(
  tsv: string,
  columns: ColumnMapping<T>[],
): ParsedRow<T>[] {
  const lines = tsv.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Check if first row looks like a header row (contains at least one matching column label)
  const candidateHeader = lines[0].split("\t");
  const hasHeader = candidateHeader.some((cell) =>
    columns.some((col) => matchHeader(cell, col.headers))
  );

  let headers: string[];
  let dataLines: string[];

  if (hasHeader) {
    headers = candidateHeader;
    dataLines = lines.slice(1);
  } else {
    // No header row — use column order from `columns` definition
    headers = columns.map((c) => c.headers[0]);
    dataLines = lines;
  }

  return dataLines.map((line, idx) => {
    const cells = line.split("\t");
    const data: Partial<T> = {};
    const errors: string[] = [];

    for (const col of columns) {
      const colIdx = headers.findIndex((h) => matchHeader(h, col.headers));
      const rawValue = colIdx >= 0 ? (cells[colIdx] ?? "").trim() : "";

      if (col.required && !rawValue) {
        errors.push(`${col.label} zorunludur`);
        continue;
      }
      if (rawValue) {
        (data as Record<string, unknown>)[col.key as string] = col.transform
          ? col.transform(rawValue)
          : rawValue;
      }
    }

    return { index: idx + 1, data, errors };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExcelImportDialog<T extends Record<string, unknown>>({
  title,
  endpoint,
  columns,
  templateFileName,
  templateRow,
  onSuccess,
}: ExcelImportDialogProps<T>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");
  const [rows, setRows] = useState<ParsedRow<T>[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [importing, startImporting] = useTransition();
  const [results, setResults] = useState<{ ok: number; fail: number } | null>(null);

  function reset() {
    setRows([]);
    setFileName(null);
    setPasteText("");
    setResults(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handlePasteTextChange(value: string) {
    setPasteText(value);
    setResults(null);
    if (!value.trim()) { setRows([]); return; }
    const parsed = parseTsvToRows<T>(value, columns);
    setRows(parsed);
  }

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([templateRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Şablon");
    XLSX.writeFile(wb, `${templateFileName}.xlsx`);
  }

  function handleFile(file: File) {
    setResults(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (raw.length === 0) {
          toast.error("Dosyada veri satırı bulunamadı.");
          return;
        }

        // Map raw headers to column keys
        const firstRow = raw[0] as Record<string, unknown>;
        const excelHeaders = Object.keys(firstRow);

        const parsed: ParsedRow<T>[] = raw.map((row, idx) => {
          const data: Partial<T> = {};
          const errors: string[] = [];

          for (const col of columns) {
            const matchedHeader = excelHeaders.find((h) => matchHeader(h, col.headers));
            const rawValue = matchedHeader != null ? String(row[matchedHeader] ?? "") : "";

            if (col.required && (!rawValue || rawValue.trim() === "")) {
              errors.push(`${col.label} zorunludur`);
              continue;
            }

            if (rawValue) {
              if (col.transform) {
                (data as Record<string, unknown>)[col.key as string] = col.transform(rawValue);
              } else {
                (data as Record<string, unknown>)[col.key as string] = rawValue.trim();
              }
            }
          }

          return { index: idx + 2, data, errors };
        });

        setFileName(file.name);
        setRows(parsed);
      } catch {
        toast.error("Dosya okunamadı. Geçerli bir Excel veya CSV dosyası seçin.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    const validRows = rows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error("İçe aktarılacak geçerli satır yok.");
      return;
    }

    let ok = 0;
    let fail = 0;

    startImporting(async () => {
      for (const row of validRows) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(row.data),
          });
          if (res.ok) {
            ok++;
          } else {
            fail++;
          }
        } catch {
          fail++;
        }
      }
      setResults({ ok, fail });
      if (ok > 0) {
        toast.success(`${ok} kayıt başarıyla içe aktarıldı.${fail > 0 ? ` ${fail} kayıt başarısız.` : ""}`);
        onSuccess();
      } else {
        toast.error("Hiçbir kayıt içe aktarılamadı.");
      }
    });
  }

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const errorCount = rows.filter((r) => r.errors.length > 0).length;

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="h-4 w-4" />
        İçe Aktar
      </Button>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Dosya yükleyin veya Excel'den kopyaladığınız hücreleri yapıştırın.
          </p>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b border-border/60">
          <button
            className={`px-5 py-2.5 text-sm font-medium transition-colors ${activeTab === "file" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => { setActiveTab("file"); setRows([]); setPasteText(""); setResults(null); }}
          >
            <span className="flex items-center gap-2"><FileSpreadsheet className="h-3.5 w-3.5" />Dosya Yükle</span>
          </button>
          <button
            className={`px-5 py-2.5 text-sm font-medium transition-colors ${activeTab === "paste" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => { setActiveTab("paste"); setRows([]); setFileName(null); setResults(null); }}
          >
            <span className="flex items-center gap-2"><ClipboardPaste className="h-3.5 w-3.5" />Yapıştır</span>
          </button>
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {activeTab === "file" ? (
              <>
                {/* Upload area */}
                <div
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/60 bg-muted/30 p-8 transition-colors hover:border-primary/40 hover:bg-muted/50"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleFile(file);
                  }}
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      {fileName ?? "Dosya seçin veya buraya sürükleyin"}
                    </p>
                    <p className="text-xs text-muted-foreground">.xlsx, .xls, .csv desteklenir</p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                  />
                </div>

                {/* Template download */}
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Örnek şablon</p>
                    <p className="text-xs text-muted-foreground">
                      Beklenen sütunları içeren boş şablonu indirin.
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={downloadTemplate}>
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    İndir
                  </Button>
                </div>
              </>
            ) : (
              /* Paste tab */
              <div className="space-y-3">
                <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <p className="text-sm font-medium mb-1">Excel'den yapıştırın</p>
                  <p className="text-xs text-muted-foreground">
                    Excel'de hücreleri seçin (<kbd className="rounded border px-1 text-[10px]">Ctrl+C</kbd>), ardından aşağıya yapıştırın (<kbd className="rounded border px-1 text-[10px]">Ctrl+V</kbd>).<br />
                    İlk satır başlık içeriyorsa otomatik algılanır. Sütun sırası: <span className="font-medium">{columns.map(c => c.headers[0]).join(" → ")}</span>
                  </p>
                </div>
                <Textarea
                  placeholder="Excel'den kopyaladığınız hücreleri buraya yapıştırın…"
                  className="min-h-[160px] font-mono text-xs resize-y"
                  value={pasteText}
                  onChange={(e) => handlePasteTextChange(e.target.value)}
                />
              </div>
            )}

            {/* Column info */}
            <div className="rounded-xl border border-border/50 bg-background/50 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Desteklenen sütunlar
              </p>
              <div className="flex flex-wrap gap-1.5">
                {columns.map((col) => (
                  <Badge key={col.key as string} variant={col.required ? "default" : "outline"} className="text-xs">
                    {col.headers[0]}{col.required ? " *" : ""}
                  </Badge>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">* zorunlu alan</p>
            </div>

            {/* Parsed preview */}
            {rows.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium">{rows.length} satır okundu</p>
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" /> {validCount} geçerli
                  </Badge>
                  {errorCount > 0 && (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" /> {errorCount} hatalı
                    </Badge>
                  )}
                </div>

                <div className="overflow-hidden rounded-xl border border-border/60">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/40">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground w-10">#</th>
                        {columns.slice(0, 5).map((col) => (
                          <th key={col.key as string} className="px-3 py-2 text-left font-medium text-muted-foreground">
                            {col.label}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 20).map((row) => (
                        <tr
                          key={row.index}
                          className={`border-b border-border/40 ${row.errors.length > 0 ? "bg-red-500/5" : "bg-background"}`}
                        >
                          <td className="px-3 py-2 text-muted-foreground">{row.index}</td>
                          {columns.slice(0, 5).map((col) => (
                            <td key={col.key as string} className="px-3 py-2 max-w-[120px] truncate">
                              {String((row.data as Record<string, unknown>)[col.key as string] ?? "—")}
                            </td>
                          ))}
                          <td className="px-3 py-2">
                            {row.errors.length > 0 ? (
                              <span className="flex items-center gap-1 text-destructive">
                                <AlertTriangle className="h-3 w-3" />
                                {row.errors[0]}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircle2 className="h-3 w-3" /> Geçerli
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 20 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground bg-muted/20">
                      … ve {rows.length - 20} satır daha
                    </p>
                  )}
                </div>

                {results && (
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm">
                      <span className="font-medium text-emerald-600">{results.ok} kayıt</span> oluşturuldu
                      {results.fail > 0 && (
                        <span className="ml-2 text-destructive">{results.fail} başarısız</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-6 py-4">
          <Button variant="ghost" onClick={() => { setOpen(false); reset(); }}>
            Kapat
          </Button>
          <Button
            onClick={handleImport}
            disabled={validCount === 0 || importing || results != null}
            className="gap-2"
          >
            {importing ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Aktarılıyor…</>
            ) : (
              <><Upload className="h-4 w-4" /> {validCount} Kaydı Aktar</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
