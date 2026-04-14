CREATE TABLE "DriverMessage" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DriverMessage_createdAt_idx" ON "DriverMessage"("createdAt");
CREATE INDEX "DriverMessage_driverId_createdAt_idx" ON "DriverMessage"("driverId", "createdAt");
CREATE INDEX "DriverMessage_senderUserId_createdAt_idx" ON "DriverMessage"("senderUserId", "createdAt");

ALTER TABLE "DriverMessage"
ADD CONSTRAINT "DriverMessage_driverId_fkey"
FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DriverMessage"
ADD CONSTRAINT "DriverMessage_senderUserId_fkey"
FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;