import type {
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
