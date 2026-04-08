import type {
  User,
  Vehicle,
  Trailer,
  Driver,
  Order,
  FuelRecord,
  Notification,
  UserRole,
  VehicleStatus,
  TrailerStatus,
  OrderCategory,
  TradeType,
  OrderStatus,
  NotificationType,
} from "@prisma/client";

// Re-export Prisma types
export type {
  User,
  Vehicle,
  Trailer,
  Driver,
  Order,
  FuelRecord,
  Notification,
  UserRole,
  VehicleStatus,
  TrailerStatus,
  OrderCategory,
  TradeType,
  OrderStatus,
  NotificationType,
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
