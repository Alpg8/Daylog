-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "maintenanceExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN "expiryDate" TIMESTAMP(3);
