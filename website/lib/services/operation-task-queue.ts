import { prisma } from "@/lib/db";
import { notificationService } from "@/lib/services/notification";
import type { OrderTimelineWarning } from "@/lib/services/driver-operations";

interface SyncInput {
  orderId: string;
  driverId?: string | null;
  warnings: OrderTimelineWarning[];
}

function buildTaskKey(orderId: string, warningCode: string) {
  return `ORDER:${orderId}:${warningCode}`;
}

export async function syncOperationTasksForOrder(input: SyncInput) {
  const now = new Date();
  const activeKeys = new Set<string>();

  for (const warning of input.warnings) {
    const taskKey = buildTaskKey(input.orderId, warning.code);
    activeKeys.add(taskKey);

    const existing = await prisma.operationTask.findUnique({
      where: { taskKey },
      select: { id: true, status: true },
    });

    if (!existing) {
      await prisma.operationTask.create({
        data: {
          taskKey,
          orderId: input.orderId,
          driverId: input.driverId ?? null,
          warningCode: warning.code,
          title: `Operasyon uyarisi: ${warning.code}`,
          description: warning.message,
          status: "OPEN",
          firstSeenAt: now,
          lastSeenAt: now,
        },
      });

      await notifyOpsTaskCreated(input.orderId, warning.message);
      continue;
    }

    const reopened = existing.status === "RESOLVED" || existing.status === "DISMISSED";

    await prisma.operationTask.update({
      where: { taskKey },
      data: {
        status: "OPEN",
        description: warning.message,
        driverId: input.driverId ?? null,
        lastSeenAt: now,
        resolvedAt: null,
      },
    });

    if (reopened) {
      await notifyOpsTaskCreated(input.orderId, `${warning.message} (yeniden acildi)`);
    }
  }

  const openTasks = await prisma.operationTask.findMany({
    where: {
      orderId: input.orderId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    select: { taskKey: true },
  });

  const toResolve = openTasks
    .map((task) => task.taskKey)
    .filter((taskKey) => !activeKeys.has(taskKey));

  if (toResolve.length > 0) {
    await prisma.operationTask.updateMany({
      where: { taskKey: { in: toResolve } },
      data: { status: "RESOLVED", resolvedAt: now, lastSeenAt: now },
    });
  }
}

async function notifyOpsTaskCreated(orderId: string, message: string) {
  const opsUsers = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "DISPATCHER"] }, isActive: true },
    select: { id: true },
  });

  await Promise.all(
    opsUsers.map((user) =>
      notificationService.create(
        user.id,
        "Operasyon gorevi olusturuldu",
        `Order ${orderId.slice(0, 8)} - ${message}`,
        "TASK"
      )
    )
  );
}
