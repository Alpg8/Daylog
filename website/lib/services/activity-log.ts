import { prisma } from "@/lib/db";
import { notificationService } from "@/lib/services/notification";
import type { ActionSource, Prisma, UserRole } from "@/lib/db/prisma-client";

const USER_ROLES: UserRole[] = ["ADMIN", "DISPATCHER", "DRIVER"];
const ACTION_SOURCES: ActionSource[] = ["WEB", "APP", "SYSTEM"];

function toUserRole(role?: string | null): UserRole | null {
  return role && USER_ROLES.includes(role as UserRole) ? (role as UserRole) : null;
}

function toActionSource(source?: string | null): ActionSource {
  return source && ACTION_SOURCES.includes(source as ActionSource) ? (source as ActionSource) : "WEB";
}

interface LogInput {
  userId?: string | null;
  role?: string | null;
  source?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  message?: string;
  metadata?: Prisma.InputJsonValue;
  notifyOps?: boolean;
  /** userId of the driver's User account to notify (not the Driver.id) */
  notifyDriverUserId?: string | null;
  driverTitle?: string;
  driverMessage?: string;
}

export async function recordActivity(input: LogInput) {
  const log = await prisma.userActivityLog.create({
    data: {
      userId: input.userId ?? null,
      role: toUserRole(input.role),
      source: toActionSource(input.source),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      message: input.message ?? null,
      metadata: input.metadata,
    },
  });

  if (input.notifyOps) {
    const opsUsers = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "DISPATCHER"] }, isActive: true },
      select: { id: true },
    });

    const actorRole = toUserRole(input.role);
    const actorPrefix = actorRole ? `[${actorRole}]` : "[SYSTEM]";
    await Promise.all(
      opsUsers.map((user) =>
        notificationService.create(
          user.id,
          "Yeni veri girisi",
          `${actorPrefix} ${input.action} - ${input.entityType}${input.entityId ? ` (${input.entityId.slice(0, 8)})` : ""}`,
          "INFO"
        )
      )
    );
  }

  if (input.notifyDriverUserId) {
    await notificationService.create(
      input.notifyDriverUserId,
      input.driverTitle ?? "Güncelleme",
      input.driverMessage ?? `${input.entityType} bilgileriniz güncellendi`,
      "INFO"
    );
  }

  return log;
}
