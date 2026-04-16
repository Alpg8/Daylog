import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/lib/services/storage";

export type AttachmentEntityType = "order" | "driver" | "vehicle" | "trailer";

const fieldMap: Record<AttachmentEntityType, "orderId" | "driverId" | "vehicleId" | "trailerId"> = {
  order: "orderId",
  driver: "driverId",
  vehicle: "vehicleId",
  trailer: "trailerId",
};

async function assertEntityExists(entityType: AttachmentEntityType, entityId: string) {
  switch (entityType) {
    case "order": {
      const record = await prisma.order.findUnique({ where: { id: entityId }, select: { id: true } });
      if (!record) throw new Error("Order not found");
      return;
    }
    case "driver": {
      const record = await prisma.driver.findUnique({ where: { id: entityId }, select: { id: true } });
      if (!record) throw new Error("Driver not found");
      return;
    }
    case "vehicle": {
      const record = await prisma.vehicle.findUnique({ where: { id: entityId }, select: { id: true } });
      if (!record) throw new Error("Vehicle not found");
      return;
    }
    case "trailer": {
      const record = await prisma.trailer.findUnique({ where: { id: entityId }, select: { id: true } });
      if (!record) throw new Error("Trailer not found");
      return;
    }
  }
}

export async function listAttachments(entityType: AttachmentEntityType, entityId: string) {
  await assertEntityExists(entityType, entityId);
  return prisma.attachment.findMany({
    where: { [fieldMap[entityType]]: entityId },
    orderBy: { createdAt: "desc" },
  });
}

export async function uploadAttachment(entityType: AttachmentEntityType, entityId: string, file: File, label?: string | null, expiryDate?: Date | null) {
  await assertEntityExists(entityType, entityId);

  const storage = getStorageProvider();
  const uploaded = await storage.upload(file, `${entityType}-attachments/${entityId}`);

  return prisma.attachment.create({
    data: {
      url: uploaded.url,
      key: uploaded.key,
      label: label?.trim() || file.name,
      mimeType: uploaded.mimeType,
      size: uploaded.size,
      expiryDate: expiryDate ?? undefined,
      [fieldMap[entityType]]: entityId,
    },
  });
}

export async function deleteAttachment(attachmentId: string) {
  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
  if (!attachment) {
    throw new Error("Attachment not found");
  }

  const storage = getStorageProvider();
  await storage.delete(attachment.key);
  await prisma.attachment.delete({ where: { id: attachmentId } });

  return attachment;
}