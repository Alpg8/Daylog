-- 1) Typed enums for usage and ownership
CREATE TYPE "UsageType" AS ENUM ('YURTICI', 'YURTDISI');
CREATE TYPE "OwnershipType" AS ENUM ('OZMAL', 'KIRALIK');

-- 2) Convert string columns to enums
ALTER TABLE "Vehicle"
  ALTER COLUMN "usageType" TYPE "UsageType" USING ("usageType"::"UsageType"),
  ALTER COLUMN "ownershipType" TYPE "OwnershipType" USING ("ownershipType"::"OwnershipType");

ALTER TABLE "Driver"
  ALTER COLUMN "usageType" TYPE "UsageType" USING ("usageType"::"UsageType"),
  ALTER COLUMN "ownershipType" TYPE "OwnershipType" USING ("ownershipType"::"OwnershipType");

-- 3) Notifications: track read timestamp
ALTER TABLE "Notification"
  ADD COLUMN "readAt" TIMESTAMP(3);

-- 4) Driver confirmation safer default
ALTER TABLE "DriverConfirmation"
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- 5) Performance indexes
CREATE INDEX "Driver_passportExpiryDate_idx" ON "Driver"("passportExpiryDate");
CREATE INDEX "Driver_licenseExpiryDate_idx" ON "Driver"("licenseExpiryDate");
CREATE INDEX "Driver_psychotechnicExpiryDate_idx" ON "Driver"("psychotechnicExpiryDate");

CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_driverId_status_idx" ON "Order"("driverId", "status");
CREATE INDEX "Order_vehicleId_status_idx" ON "Order"("vehicleId", "status");
CREATE INDEX "Order_trailerId_status_idx" ON "Order"("trailerId", "status");
CREATE INDEX "Order_createdByUserId_createdAt_idx" ON "Order"("createdByUserId", "createdAt");

CREATE INDEX "FuelRecord_vehicleId_date_idx" ON "FuelRecord"("vehicleId", "date");
CREATE INDEX "FuelRecord_driverId_date_idx" ON "FuelRecord"("driverId", "date");

CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

CREATE INDEX "Attachment_driverId_idx" ON "Attachment"("driverId");
CREATE INDEX "Attachment_vehicleId_idx" ON "Attachment"("vehicleId");
CREATE INDEX "Attachment_trailerId_idx" ON "Attachment"("trailerId");
CREATE INDEX "Attachment_orderId_idx" ON "Attachment"("orderId");

-- 6) Attachment must belong to exactly one entity.
-- Marked NOT VALID to avoid failing on legacy bad rows; new rows are enforced.
ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_single_owner_check"
  CHECK (
    (
      CASE WHEN "driverId" IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN "vehicleId" IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN "trailerId" IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN "orderId" IS NOT NULL THEN 1 ELSE 0 END
    ) = 1
  ) NOT VALID;
