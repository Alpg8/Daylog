import * as XLSX from "xlsx";

export interface ExcelColumn {
  key: string;
  header: string;
  width?: number;
}

/**
 * Export data to an Excel file and trigger browser download.
 */
export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExcelColumn[],
  fileName: string
): void {
  const worksheetData = [
    columns.map((col) => col.header),
    ...data.map((row) => columns.map((col) => row[col.key] ?? "")),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  worksheet["!cols"] = columns.map((col) => ({ wch: col.width ?? 18 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Parse an Excel file buffer into row objects.
 */
export function parseExcelBuffer(buffer: ArrayBuffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, { defval: null });
}

/**
 * Read an Excel File object in the browser and return parsed rows.
 */
export async function readExcelFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  return parseExcelBuffer(buffer);
}
