import type {
  DriverConfirmationType,
  DriverEventType,
  User,
  UserRole,
} from "@/lib/db/prisma-client";
import { prisma } from "@/lib/db";
import { notificationService } from "@/lib/services/notification";

export async function getDriverByUser(userId: string) {
  return prisma.driver.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      fullName: true,
      isActive: true,
      assignedVehicleId: true,
    },
  });
}

export function isOpsViewer(role: string): boolean {
  return role === "ADMIN" || role === "DISPATCHER";
}

export function isDriverRole(role: string): boolean {
  return role === "DRIVER";
}

export async function assertDriverOrderAccess(userId: string, role: string, orderId: string) {
  if (isOpsViewer(role)) {
    return prisma.order.findUnique({ where: { id: orderId } });
  }

  const driver = await getDriverByUser(userId);
  if (!driver || !driver.isActive) return null;

  return prisma.order.findFirst({
    where: { id: orderId, driverId: driver.id },
  });
}

export async function notifyOpsTeam(title: string, message: string) {
  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "DISPATCHER"] }, isActive: true },
    select: { id: true },
  });

  await Promise.all(
    users.map((user) => notificationService.create(user.id, title, message, "TASK"))
  );
}

const REQUIRED_PHOTO_EVENT_TYPES: DriverEventType[] = [
  "LOAD",
  "DELIVERY",
  "HANDOVER",
  "END_JOB",
];

const REQUIRED_CONFIRMATION_TYPES: DriverConfirmationType[] = [
  "JOB_STARTED",
  "LOADING_CONFIRMED",
  "DELIVERY_CONFIRMED",
];

export interface OrderTimelineWarning {
  code: "MISSING_EVENT" | "MISSING_PHOTO" | "MISSING_CONFIRMATION" | "MISSING_CLOSEOUT";
  message: string;
}

export function buildTimelineWarnings(input: {
  eventTypes: DriverEventType[];
  eventTypesWithPhoto: DriverEventType[];
  confirmationTypes: DriverConfirmationType[];
  hasEndJob: boolean;
  orderStatus: string;
}): OrderTimelineWarning[] {
  const warnings: OrderTimelineWarning[] = [];

  const uniqueEventTypes = Array.from(new Set(input.eventTypes));
  const uniqueEventTypesWithPhoto = Array.from(new Set(input.eventTypesWithPhoto));
  const uniqueConfirmationTypes = Array.from(new Set(input.confirmationTypes));

  // Base operation flow checks
  if (input.orderStatus === "IN_PROGRESS" || input.orderStatus === "COMPLETED") {
    if (!uniqueEventTypes.includes("START_JOB")) {
      warnings.push({
        code: "MISSING_EVENT",
        message: "Is baslangici kaydi (START_JOB) eksik",
      });
    }
  }

  if (input.orderStatus === "COMPLETED" && !uniqueEventTypes.includes("DELIVERY")) {
    warnings.push({
      code: "MISSING_EVENT",
      message: "Teslim adimi (DELIVERY) eksik",
    });
  }

  for (const eventType of REQUIRED_PHOTO_EVENT_TYPES) {
    // Only require photo if that event has been performed
    if (uniqueEventTypes.includes(eventType) && !uniqueEventTypesWithPhoto.includes(eventType)) {
      warnings.push({
        code: "MISSING_PHOTO",
        message: `${eventType} adiminda fotograf eksik`,
      });
    }
  }

  for (const confirmationType of REQUIRED_CONFIRMATION_TYPES) {
    // Only require confirmations when related flow is reached
    if (
      confirmationType === "JOB_STARTED" &&
      !uniqueEventTypes.includes("START_JOB")
    ) {
      continue;
    }

    if (
      confirmationType === "LOADING_CONFIRMED" &&
      !uniqueEventTypes.includes("LOAD")
    ) {
      continue;
    }

    if (
      confirmationType === "DELIVERY_CONFIRMED" &&
      !uniqueEventTypes.includes("DELIVERY")
    ) {
      continue;
    }

    if (!uniqueConfirmationTypes.includes(confirmationType)) {
      warnings.push({
        code: "MISSING_CONFIRMATION",
        message: `${confirmationType} onami eksik`,
      });
    }
  }

  if (input.orderStatus === "COMPLETED" && !input.hasEndJob) {
    warnings.push({
      code: "MISSING_CLOSEOUT",
      message: "Siparis tamamlandi ancak END_JOB kaydi yok",
    });
  }

  return warnings;
}

export async function mapDriverForUserOrFail(userId: string, role: string) {
  if (!isDriverRole(role)) {
    return null;
  }

  const driver = await prisma.driver.findUnique({
    where: { userId },
    select: { id: true, fullName: true, isActive: true },
  });

  if (!driver || !driver.isActive) {
    return null;
  }

  return driver;
}

export function canManageAllOps(role: UserRole): boolean {
  return role === "ADMIN" || role === "DISPATCHER";
}

export async function resolveDriverUserIds(driverId: string): Promise<string[]> {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    select: { userId: true },
  });

  const ids: string[] = [];
  if (driver?.userId) ids.push(driver.userId);

  return ids;
}

export async function createOpsNotificationForDriverAndOps(input: {
  driverId: string;
  title: string;
  message: string;
}) {
  const driverUserIds = await resolveDriverUserIds(input.driverId);
  const opsUsers: Pick<User, "id">[] = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "DISPATCHER"] }, isActive: true },
    select: { id: true },
  });

  const allUsers = Array.from(new Set([...driverUserIds, ...opsUsers.map((u) => u.id)]));

  await Promise.all(
    allUsers.map((userId) => notificationService.create(userId, input.title, input.message, "TASK"))
  );
}
