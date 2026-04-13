"use client";

import { useRef } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { readExcelFile } from "@/lib/utils/excel";

interface ExcelImportProps {
  onImport: (rows: Record<string, unknown>[]) => Promise<void>;
  label?: string;
}

export function ExcelImport({ onImport, label = "Excel'den İçe Aktar" }: ExcelImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Lütfen geçerli bir Excel dosyası seçin (.xlsx, .xls, .csv)");
      return;
    }

    try {
      toast.loading("Dosya işleniyor...");
      const rows = await readExcelFile(file);
      toast.dismiss();
      await onImport(rows);
    } catch (error) {
      toast.dismiss();
      toast.error("Dosya işlenirken hata oluştu");
      console.error(error);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
      >
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </>
  );
}
