import { prisma } from "@/lib/db";

export async function syncOperationTasksForOrder(input: { orderId: string }) {
  const now = new Date();

  const openTasks = await prisma.operationTask.findMany({
    where: {
      orderId: input.orderId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    select: { taskKey: true },
  });

  if (openTasks.length > 0) {
    await prisma.operationTask.updateMany({
      where: { taskKey: { in: openTasks.map((t) => t.taskKey) } },
      data: { status: "RESOLVED", resolvedAt: now, lastSeenAt: now },
    });
  }
}
