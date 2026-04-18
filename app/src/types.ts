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
  jobType?: "LOADING" | "UNLOADING" | "FULL" | null;
  phaseStartLocation?: string | null;
  phaseLoadLocation?: string | null;
  phaseUnloadLocation?: string | null;
  phaseDeliveryLocation?: string | null;
  loadingAddress?: string | null;
  deliveryAddress?: string | null;
  vehicle?: { plateNumber: string } | null;
  driverEvents?: Array<{ type: string; eventAt: string; photos?: Array<{ url: string; label: string | null }> }>;
}

export interface AttachmentItem {
  id: string;
  label: string | null;
  url: string;
  mimeType: string | null;
  size: number;
  createdAt: string;
}

export interface DriverNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export type FuelRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface DriverFuelRequest {
  id: string;
  vehicleId: string;
  orderId: string | null;
  status: FuelRequestStatus;
  km: number;
  tankLeft: number;
  tankRight: number;
  requestedLiters: number | null;
  notes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export type DriverMessageDirection = "DRIVER_TO_OFFICE" | "OFFICE_TO_DRIVER";

export interface DriverMessage {
  id: string;
  driverId: string;
  senderUserId: string;
  recipientUserId?: string | null;
  subject?: string | null;
  message: string;
  direction: DriverMessageDirection;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  senderUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface DriverProfile {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  notes: string | null;
  attachments?: AttachmentItem[];
  passportRemainingDays?: number | null;
  passportExpiryDate?: string | null;
  licenseRemainingDays?: number | null;
  licenseExpiryDate?: string | null;
  psychotechnicRemainingDays?: number | null;
  psychotechnicExpiryDate?: string | null;
  assignedVehicle?: {
    id: string;
    plateNumber: string;
    brand?: string | null;
    model?: string | null;
    status?: string | null;
    notes?: string | null;
    attachments?: AttachmentItem[];
  } | null;
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
