"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Driver { id: string; fullName: string }
interface Vehicle { id: string; plateNumber: string }

interface OperationsSummaryFiltersProps {
  drivers: Driver[];
  vehicles: Vehicle[];
  defaultMonth: string; // YYYY-MM
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tüm Durumlar" },
  { value: "PENDING", label: "Beklemede" },
  { value: "PLANNED", label: "Planlandı" },
  { value: "IN_PROGRESS", label: "Devam Ediyor" },
  { value: "COMPLETED", label: "Tamamlandı" },
  { value: "CANCELLED", label: "İptal" },
];

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "Tüm Kategoriler" },
  { value: "DOMESTIC", label: "Yurtiçi" },
  { value: "IMPORT", label: "İthalat" },
  { value: "EXPORT", label: "İhracat" },
];

// Generate last 12 months + next 2 months
function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = -12; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options.reverse();
}

export function OperationsSummaryFilters({ drivers, vehicles, defaultMonth }: OperationsSummaryFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const month = searchParams.get("month") ?? "ALL";
  const driverId = searchParams.get("driverId") ?? "ALL";
  const vehicleId = searchParams.get("vehicleId") ?? "ALL";
  const status = searchParams.get("status") ?? "ALL";
  const category = searchParams.get("category") ?? "ALL";

  const push = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === "ALL" || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const hasFilters =
    searchParams.has("month") ||
    searchParams.has("driverId") ||
    searchParams.has("vehicleId") ||
    searchParams.has("status") ||
    searchParams.has("category");

  const clearFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  const months = generateMonthOptions();

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background/50 p-3 transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {/* Month */}
      <Select value={month} onValueChange={(v) => push({ month: v })}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder="Tüm Zamanlar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL" className="text-xs">Tüm Zamanlar</SelectItem>
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value} className="text-xs">
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select value={status} onValueChange={(v) => push({ status: v })}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder="Tüm Durumlar" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Category */}
      <Select value={category} onValueChange={(v) => push({ category: v })}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue placeholder="Tüm Kategoriler" />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Driver */}
      <Select value={driverId} onValueChange={(v) => push({ driverId: v })}>
        <SelectTrigger className="h-8 w-44 text-xs">
          <SelectValue placeholder="Tüm Sürücüler" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL" className="text-xs">Tüm Sürücüler</SelectItem>
          {drivers.map((d) => (
            <SelectItem key={d.id} value={d.id} className="text-xs">{d.fullName}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Vehicle */}
      <Select value={vehicleId} onValueChange={(v) => push({ vehicleId: v })}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder="Tüm Araçlar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL" className="text-xs">Tüm Araçlar</SelectItem>
          {vehicles.map((v) => (
            <SelectItem key={v.id} value={v.id} className="text-xs">{v.plateNumber}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={clearFilters}>
          <X className="h-3.5 w-3.5" />
          Filtreleri Temizle
        </Button>
      )}
    </div>
  );
}
