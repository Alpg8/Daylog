"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type Table as TanstackTable,
  type Cell,
  type RowData,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  X,
  Columns3,
  Pencil,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── TanStack Table type augmentation ────────────────────────────────────────
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface TableMeta<TData extends RowData> {
    onCellEdit?: (rowIndex: number, columnId: string, value: string) => void;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    editable?: boolean;
    type?: "text" | "number" | "date";
  }
}

export interface FilterConfig {
  label: string;
  column: string;
  options?: Array<{ label: string; value: string }>;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  onCellEdit?: (rowIndex: number, columnId: string, value: string) => void;
}

// ── Editable cell wrapper ────────────────────────────────────────────────────
function EditableCell<TData, TValue>({
  cell,
  children,
}: {
  cell: Cell<TData, TValue>;
  children: React.ReactNode;
}) {
  const isEditable = cell.column.columnDef.meta?.editable;
  const onCellEdit = cell.getContext().table.options.meta?.onCellEdit;
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!isEditable || !onCellEdit) return <>{children}</>;

  const commit = () => {
    onCellEdit(cell.row.index, cell.column.id, localValue);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type={cell.column.columnDef.meta?.type ?? "text"}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { e.preventDefault(); cancel(); }
          }}
          onBlur={commit}
          className="min-w-0 flex-1 rounded-md border border-primary/60 bg-background px-2 py-0.5 text-sm text-foreground outline-none ring-1 ring-primary/40 focus:ring-primary"
        />
        <button onClick={commit} className="shrink-0 rounded p-0.5 text-primary hover:bg-primary/10">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={cancel} className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="group flex cursor-text items-center gap-1.5 rounded px-0.5 hover:bg-primary/5 transition-colors"
      onDoubleClick={() => {
        setLocalValue(String(cell.getValue() ?? ""));
        setEditing(true);
      }}
      title="Düzenlemek için çift tıklayın"
    >
      {children}
      <Pencil className="h-3 w-3 shrink-0 text-primary/0 group-hover:text-primary/40 transition-colors" />
    </div>
  );
}

// ── Column Visibility Toggle ─────────────────────────────────────────────────
function ColumnVisibilityToggle<TData>({ table }: { table: TanstackTable<TData> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className={cn("gap-1.5 text-xs", open && "bg-muted")}
      >
        <Columns3 className="h-3.5 w-3.5" />
        Sütunlar
      </Button>
      {open && (
        <div className="glass-strong absolute right-0 top-full z-[200] mt-1 min-w-[190px] rounded-xl p-2 shadow-xl">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Sütunları Göster / Gizle
          </p>
          <div className="space-y-0.5">
            {table.getAllColumns().filter((col) => col.getCanHide()).map((col) => {
              const label =
                typeof col.columnDef.header === "string" ? col.columnDef.header : col.id;
              return (
                <label
                  key={col.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={col.getIsVisible()}
                    onChange={(e) => col.toggleVisibility(e.target.checked)}
                    className="accent-primary"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline column filter input ────────────────────────────────────────────────
function ColumnFilterInput({
  config,
  value,
  onChange,
}: {
  config: FilterConfig | undefined;
  value: string;
  onChange: (v: string) => void;
}) {
  const isActive = Boolean(value);

  if (config?.options) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-md border bg-background px-1.5 py-0.5 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-primary/50 transition-colors",
          isActive
            ? "border-primary/50 bg-primary/5"
            : "border-border text-muted-foreground"
        )}
      >
        <option value="">Tümü</option>
        {config.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filtrele..."
        className={cn(
          "w-full rounded-md border bg-background px-1.5 py-0.5 text-[11px] outline-none focus:ring-1 focus:ring-primary/50 transition-colors",
          isActive
            ? "border-primary/50 bg-primary/5 text-foreground pr-5"
            : "border-border text-muted-foreground placeholder:text-muted-foreground/40"
        )}
      />
      {isActive && (
        <button
          onClick={() => onChange("")}
          className="absolute right-1 text-muted-foreground/60 hover:text-foreground"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}

// ── Main DataTable ───────────────────────────────────────────────────────────
export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  searchPlaceholder = "Ara...",
  filters,
  onCellEdit,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const filterMap = new Map<string, FilterConfig>(filters?.map((f) => [f.column, f]) ?? []);
  const activeFilterCount = columnFilters.length;

  const columnLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of columns) {
      const c = col as unknown as Record<string, unknown>;
      const id = (c.accessorKey as string | undefined) ?? (c.id as string | undefined);
      if (id && typeof c.header === "string") map.set(id, c.header);
    }
    return map;
  }, [columns]);

  const setColFilter = (column: string, value: string) => {
    setColumnFilters((prev) => {
      const without = prev.filter((f) => f.id !== column);
      if (!value) return without;
      return [...without, { id: column, value }];
    });
  };

  const getColFilterValue = (column: string): string =>
    (columnFilters.find((f) => f.id === column)?.value as string) ?? "";

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters, globalFilter, columnVisibility },
    initialState: { pagination: { pageSize: 20 } },
    meta: { onCellEdit },
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <div className="overflow-hidden rounded-2xl border border-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
      </div>
    );
  }

  const pageSizes = [10, 20, 50, 100];

  return (
    <div className="space-y-3 page-enter">
      {/* Toolbar */}
      <div className="surface-panel flex flex-wrap items-center gap-2 rounded-xl px-3 py-2">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs bg-background/70"
        />

        {/* Active filter chips */}
        {columnFilters.map((f) => {
          const cfg = filterMap.get(f.id as string);
          const label =
            cfg?.options?.find((o) => o.value === f.value)?.label ?? String(f.value);
          return (
            <span
              key={f.id}
              className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary shadow-sm"
            >
              <span className="opacity-60">
                {cfg?.label ?? columnLabelMap.get(f.id as string) ?? f.id}:
              </span>{" "}
              {label}
              <button
                onClick={() => setColFilter(f.id as string, "")}
                className="ml-0.5 opacity-70 hover:opacity-100"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          );
        })}

        {(activeFilterCount > 0 || globalFilter) && (
          <button
            onClick={() => { setColumnFilters([]); setGlobalFilter(""); }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Tümünü temizle
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {onCellEdit && (
            <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] text-primary/70">
              <Pencil className="h-2.5 w-2.5" />
              Çift tıkla: düzenle
            </span>
          )}
          <ColumnVisibilityToggle table={table} />
        </div>
      </div>

      {/* Table */}
      <div className="glass glass-highlight overflow-auto rounded-2xl max-h-[calc(100vh-280px)] ring-1 ring-white/20 dark:ring-white/10">
        <Table>
          <TableHeader>
            {/* ── Sort row ── */}
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortDir = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            "flex items-center gap-1",
                            canSort && "cursor-pointer select-none"
                          )}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            sortDir === "asc" ? (
                              <ArrowUp className="h-3.5 w-3.5 text-primary" />
                            ) : sortDir === "desc" ? (
                              <ArrowDown className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
                            )
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}

            {/* ── Inline filter row ── */}
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={`filter-${headerGroup.id}`} className="border-b border-border bg-muted/35">
                {headerGroup.headers.map((header) => {
                  const colId = header.column.id;
                  const isAccessorCol =
                    "accessorKey" in header.column.columnDef ||
                    "accessorFn" in header.column.columnDef;

                  return (
                    <th key={`filter-${header.id}`} className="px-3 py-1.5 border-r border-border/50 last:border-r-0">
                      {isAccessorCol ? (
                        <ColumnFilterInput
                          config={filterMap.get(colId)}
                          value={getColFilterValue(colId)}
                          onChange={(val) => setColFilter(colId, val)}
                        />
                      ) : (
                        <div className="h-5" />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={rowIndex % 2 === 1 ? "bg-muted/[0.35]" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <EditableCell cell={cell}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </EditableCell>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground/60"
                >
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="surface-panel flex items-center justify-between rounded-xl px-3 py-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} kayıt
            {activeFilterCount > 0 && (
              <span className="ml-1 text-primary/70">({activeFilterCount} filtre aktif)</span>
            )}
          </p>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size} / sayfa
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
