import { prisma } from "@/lib/db";
import { notificationService } from "@/lib/services/notification";
import type { ActionSource, UserRole } from "@prisma/client";

interface LogInput {
  userId?: string | null;
  role?: UserRole | null;
  source?: ActionSource;
  action: string;
  entityType: string;
  entityId?: string | null;
  message?: string;
  metadata?: Record<string, unknown>;
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
      role: input.role ?? null,
      source: input.source ?? "WEB",
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

    const actorPrefix = input.role ? `[${input.role}]` : "[SYSTEM]";
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
