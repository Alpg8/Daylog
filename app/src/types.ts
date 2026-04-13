export type UserRole = "ADMIN" | "DISPATCHER" | "DRIVER";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface DriverUser extends AuthUser {
  role: "DRIVER";
}

export interface DriverTask {
  id: string;
  status: string;
  cargoNumber: string | null;
  tripNumber: string | null;
  routeText: string | null;
  loadingDate?: string | null;
  unloadingDate?: string | null;
  updatedAt?: string;
  vehicle?: { plateNumber: string } | null;
  driverEvents?: Array<{ type: string; eventAt: string }>;
}

export interface DriverNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface DriverProfile {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  notes: string | null;
  assignedVehicle?: { id: string; plateNumber: string } | null;
}

export interface DriverVehicleHistoryItem {
  vehicleId: string;
  plateNumber: string;
  jobCount: number;
  lastUsedAt: string;
}

export interface DriverRecentJobItem {
  id: string;
  cargoNumber: string | null;
  tripNumber: string | null;
  status: string;
  vehiclePlate: string | null;
  updatedAt: string;
}

export interface DriverOverviewStats {
  totalJobs: number;
  completedJobs: number;
  totalFuelRecords: number;
}

export interface DriverMeResponse {
  driver: DriverProfile;
  vehicleHistory: DriverVehicleHistoryItem[];
  recentJobs: DriverRecentJobItem[];
  stats: DriverOverviewStats;
}
