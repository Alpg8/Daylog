CREATE TYPE "DriverMessageDirection" AS ENUM ('DRIVER_TO_OFFICE', 'OFFICE_TO_DRIVER');

ALTER TABLE "DriverMessage"
ADD COLUMN "recipientUserId" TEXT,
ADD COLUMN "direction" "DriverMessageDirection" NOT NULL DEFAULT 'DRIVER_TO_OFFICE',
ADD COLUMN "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "readAt" TIMESTAMP(3);

CREATE INDEX "DriverMessage_recipientUserId_createdAt_idx" ON "DriverMessage"("recipientUserId", "createdAt");
CREATE INDEX "DriverMessage_direction_isRead_createdAt_idx" ON "DriverMessage"("direction", "isRead", "createdAt");

ALTER TABLE "DriverMessage"
ADD CONSTRAINT "DriverMessage_recipientUserId_fkey"
FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;