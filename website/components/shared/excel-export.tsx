"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel, type ExcelColumn } from "@/lib/utils/excel";
import { format } from "date-fns";

interface ExcelExportProps<T extends Record<string, unknown>> {
  data: T[];
  columns?: ExcelColumn[];
  fileName: string;
  label?: string;
}

export function ExcelExport<T extends Record<string, unknown>>({
  data,
  columns,
  fileName,
  label = "Excel'e Aktar",
}: ExcelExportProps<T>) {
  const handleExport = () => {
    const timestamp = format(new Date(), "yyyy-MM-dd");
    const cols: ExcelColumn[] = columns ?? (
      data.length > 0
        ? Object.keys(data[0]).map((k) => ({ key: k, header: k }))
        : []
    );
    exportToExcel(data, cols, `${fileName}-${timestamp}`);
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={data.length === 0}>
      <Download className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
