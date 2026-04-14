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

interface RecordEntityChangeInput extends LogInput {
  before?: unknown;
  after?: unknown;
}

const REDACTED = "[REDACTED]";
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
]);

function toJsonSafe(value: unknown): Prisma.InputJsonValue | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item)) as Prisma.InputJsonArray;
  }
  if (typeof value === "object") {
    const out: Record<string, Prisma.InputJsonValue | null> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) {
        out[key] = REDACTED;
      } else {
        out[key] = toJsonSafe(val);
      }
    }
    return out as Prisma.InputJsonObject;
  }
  return String(value);
}

function buildDiff(before: Prisma.InputJsonValue | null, after: Prisma.InputJsonValue | null) {
  const beforeObj = (before && typeof before === "object" && !Array.isArray(before))
    ? (before as Prisma.InputJsonObject)
    : null;
  const afterObj = (after && typeof after === "object" && !Array.isArray(after))
    ? (after as Prisma.InputJsonObject)
    : null;

  if (!beforeObj || !afterObj) {
    return { changedFields: [] as string[], changes: null as Prisma.InputJsonObject | null };
  }

  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);
  const changedFields: string[] = [];
  const changes: Record<string, Prisma.InputJsonValue | null> = {};

  keys.forEach((key) => {
    const prev = beforeObj[key];
    const next = afterObj[key];
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      changedFields.push(key);
      changes[key] = { before: prev ?? null, after: next ?? null };
    }
  });

  return { changedFields, changes: changedFields.length ? (changes as Prisma.InputJsonObject) : null };
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
    try {
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
    } catch (error) {
      console.error("[ACTIVITY_LOG notifyOps]", error);
    }
  }

  if (input.notifyDriverUserId) {
    try {
      await notificationService.create(
        input.notifyDriverUserId,
        input.driverTitle ?? "Güncelleme",
        input.driverMessage ?? `${input.entityType} bilgileriniz güncellendi`,
        "INFO"
      );
    } catch (error) {
      console.error("[ACTIVITY_LOG notifyDriver]", error);
    }
  }

  return log;
}

export async function recordEntityChange(input: RecordEntityChangeInput) {
  const before = toJsonSafe(input.before);
  const after = toJsonSafe(input.after);
  const diff = buildDiff(before, after);

  const mergedMetadata: Record<string, Prisma.InputJsonValue | null> = {
    ...(input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
      ? (input.metadata as Prisma.InputJsonObject)
      : {}),
    changedFields: diff.changedFields,
  };

  if (before !== null) mergedMetadata.before = before;
  if (after !== null) mergedMetadata.after = after;
  if (diff.changes) mergedMetadata.changes = diff.changes;

  return recordActivity({
    ...input,
    metadata: mergedMetadata as Prisma.InputJsonObject,
  });
}
