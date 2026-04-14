import type {
  User,
  Vehicle,
  Trailer,
  Driver,
  Order,
  Attachment,
  FuelRecord,
  Notification,
  DriverMessage,
  DriverEvent,
  DriverEventPhoto,
  DriverConfirmation,
  Handover,
  UserRole,
  VehicleStatus,
  TrailerStatus,
  OrderCategory,
  TradeType,
  OrderStatus,
  NotificationType,
  DriverEventType,
  DriverEventSeverity,
  DriverConfirmationType,
  DriverConfirmationStatus,
  DriverMessageDirection,
  HandoverStatus,
} from "@/lib/db/prisma-client";

// Re-export Prisma types
export type {
  User,
  Vehicle,
  Trailer,
  Driver,
  Order,
  Attachment,
  FuelRecord,
  Notification,
  DriverMessage,
  DriverEvent,
  DriverEventPhoto,
  DriverConfirmation,
  Handover,
  UserRole,
  VehicleStatus,
  TrailerStatus,
  OrderCategory,
  TradeType,
  OrderStatus,
  NotificationType,
  DriverEventType,
  DriverEventSeverity,
  DriverConfirmationType,
  DriverConfirmationStatus,
  DriverMessageDirection,
  HandoverStatus,
};

// Extended types with relations
export type OrderWithRelations = Order & {
  vehicle?: Vehicle | null;
  trailer?: Trailer | null;
  driver?: Driver | null;
  createdByUser?: Pick<User, "id" | "name" | "email"> | null;
};

export type DriverWithVehicle = Driver & {
  assignedVehicle?: Vehicle | null;
};

export type FuelRecordWithRelations = FuelRecord & {
  vehicle: Vehicle;
  driver?: Driver | null;
};

export type DriverMessageWithRelations = DriverMessage & {
  driver: Pick<Driver, "id" | "fullName" | "phoneNumber">;
  senderUser: Pick<User, "id" | "name" | "email" | "role">;
  recipientUser?: Pick<User, "id" | "name" | "email" | "role"> | null;
};

// Auth
export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  name: string;
}

// API response helpers
export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Dashboard stats
export interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  totalVehicles: number;
  totalDrivers: number;
  pendingNotifications: number;
  recentFuelRecords: FuelRecordWithRelations[];
}
