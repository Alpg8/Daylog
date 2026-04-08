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
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, X, SlidersHorizontal, Search } from "lucide-react";
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
  searchColumn?: string;
  searchKey?: string;
  filters?: FilterConfig[];
}

// ── Column filter popover ────────────────────────────────────────────────────
interface ColumnFilterPopoverProps {
  filterId: string;
  config: FilterConfig;
  value: string;
  onChange: (val: string) => void;
}

function ColumnFilterPopover({ filterId, config, value, onChange }: ColumnFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = Boolean(value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          "ml-1 flex h-5 w-5 items-center justify-center rounded transition-colors",
          isActive
            ? "bg-blue-500/30 text-blue-300"
            : "text-white/30 hover:bg-white/10 hover:text-white/60",
        ].join(" ")}
        title={config.label}
      >
        <SlidersHorizontal className="h-3 w-3" />
      </button>
      {open && (
        <div className="glass-strong absolute left-0 top-full z-[200] mt-1 min-w-[180px] rounded-xl p-2 shadow-2xl shadow-black/50">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">
            {config.label}
          </p>
          {config.options ? (
            <div className="space-y-0.5">
              <button
                onClick={() => { onChange(""); setOpen(false); }}
                className={[
                  "w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                  !value ? "bg-blue-500/20 text-blue-300" : "text-white/60 hover:bg-white/[0.08]",
                ].join(" ")}
              >
                Tümü
              </button>
              {config.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={[
                    "w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                    value === opt.value
                      ? "bg-blue-500/20 text-blue-300"
                      : "text-white/60 hover:bg-white/[0.08]",
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Search className="h-3 w-3 shrink-0 text-white/30" />
              <input
                autoFocus
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={`${config.label} ara...`}
                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/30"
              />
              {value && (
                <button onClick={() => onChange("")}>
                  <X className="h-3 w-3 text-white/30 hover:text-white/60" />
                </button>
              )}
            </div>
          )}
        </div>
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
  searchColumn,
  searchKey,
  filters,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

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
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters, globalFilter },
    initialState: { pagination: { pageSize: 20 } },
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Global search + active filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />

        {/* Active filter chips */}
        {columnFilters.map((f) => {
          const cfg = filterMap.get(f.id as string);
          const label = cfg?.options?.find((o) => o.value === f.value)?.label ?? String(f.value);
          return (
            <span
              key={f.id}
              className="flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300"
            >
              <span className="opacity-60">{cfg?.label ?? columnLabelMap.get(f.id as string) ?? f.id}:</span> {label}
              <button
                onClick={() => setColFilter(f.id as string, "")}
                className="ml-0.5 hover:text-white"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          );
        })}

        {(activeFilterCount > 0 || globalFilter) && (
          <button
            onClick={() => { setColumnFilters([]); setGlobalFilter(""); }}
            className="text-xs text-white/30 hover:text-white/60"
          >
            Tümünü temizle
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass glass-highlight overflow-hidden rounded-2xl">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const colId = header.column.id;
                  const filterCfg = filterMap.get(colId);
                  const sortDir = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();

                  const isAccessorCol = "accessorKey" in header.column.columnDef || "accessorFn" in header.column.columnDef;

                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center gap-0.5">
                          {/* Sort button */}
                          <div
                            className={canSort ? "flex cursor-pointer select-none items-center gap-1" : "flex items-center"}
                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && (
                              sortDir === "asc" ? (
                                <ArrowUp className="h-3.5 w-3.5 text-blue-400" />
                              ) : sortDir === "desc" ? (
                                <ArrowDown className="h-3.5 w-3.5 text-blue-400" />
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />
                              )
                            )}
                          </div>

                          {/* Column filter — shown for all accessor columns */}
                          {isAccessorCol && (
                            <ColumnFilterPopover
                              filterId={colId}
                              config={filterCfg ?? { label: columnLabelMap.get(colId) ?? colId, column: colId }}
                              value={getColFilterValue(colId)}
                              onChange={(val) => setColFilter(colId, val)}
                            />
                          )}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-white/30">
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-white/40">
          {table.getFilteredRowModel().rows.length} kayıt
          {activeFilterCount > 0 && (
            <span className="ml-1 text-blue-400/70">({activeFilterCount} filtre aktif)</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-white/50">
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
          </span>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
