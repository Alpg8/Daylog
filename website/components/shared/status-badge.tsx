import { Badge } from "@/components/ui/badge";
import type { OrderStatus, VehicleStatus, TrailerStatus } from "@prisma/client";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
    PENDING: { label: "Bekliyor", variant: "warning" },
    PLANNED: { label: "Planlandı", variant: "info" },
    IN_PROGRESS: { label: "Devam Ediyor", variant: "default" },
    COMPLETED: { label: "Tamamlandı", variant: "success" },
    CANCELLED: { label: "İptal", variant: "destructive" },
  };
  const { label, variant } = variants[status as string] ?? { label: String(status ?? "—"), variant: "secondary" as const };
  return <Badge variant={variant}>{label}</Badge>;
}

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
    AVAILABLE: { label: "Müsait", variant: "success" },
    ON_ROUTE: { label: "Rotada", variant: "default" },
    MAINTENANCE: { label: "Bakımda", variant: "warning" },
    PASSIVE: { label: "Pasif", variant: "secondary" },
    INACTIVE: { label: "Pasif", variant: "secondary" },
  };
  const { label, variant } = variants[status as string] ?? { label: String(status ?? "—"), variant: "secondary" as const };
  return <Badge variant={variant}>{label}</Badge>;
}

export function TrailerStatusBadge({ status }: { status: TrailerStatus }) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
    AVAILABLE: { label: "Müsait", variant: "success" },
    IN_USE: { label: "Kullanımda", variant: "default" },
    MAINTENANCE: { label: "Bakımda", variant: "warning" },
    SOLD: { label: "Satıldı", variant: "secondary" },
    INACTIVE: { label: "Pasif", variant: "secondary" },
  };
  const { label, variant } = variants[status as string] ?? { label: String(status ?? "—"), variant: "secondary" as const };
  return <Badge variant={variant}>{label}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "info" }> = {
    ADMIN: { label: "Admin", variant: "default" },
    DISPATCHER: { label: "Dispatcher", variant: "info" },
    DRIVER: { label: "Sürücü", variant: "secondary" },
  };
  const config = variants[role] ?? { label: role, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
