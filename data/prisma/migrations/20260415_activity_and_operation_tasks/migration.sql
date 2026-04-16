DO $$
BEGIN
  CREATE TYPE "ActionSource" AS ENUM ('WEB', 'APP', 'SYSTEM');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "OperationTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UserActivityLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "role" "UserRole",
  "source" "ActionSource" NOT NULL DEFAULT 'WEB',
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "message" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OperationTask" (
  "id" TEXT NOT NULL,
  "taskKey" TEXT NOT NULL,
  "orderId" TEXT,
  "driverId" TEXT,
  "warningCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "OperationTaskStatus" NOT NULL DEFAULT 'OPEN',
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OperationTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OperationTask_taskKey_key" ON "OperationTask"("taskKey");
CREATE INDEX IF NOT EXISTS "UserActivityLog_createdAt_idx" ON "UserActivityLog"("createdAt");
CREATE INDEX IF NOT EXISTS "UserActivityLog_entityType_createdAt_idx" ON "UserActivityLog"("entityType", "createdAt");
CREATE INDEX IF NOT EXISTS "UserActivityLog_userId_createdAt_idx" ON "UserActivityLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "OperationTask_status_lastSeenAt_idx" ON "OperationTask"("status", "lastSeenAt");
CREATE INDEX IF NOT EXISTS "OperationTask_orderId_status_idx" ON "OperationTask"("orderId", "status");
CREATE INDEX IF NOT EXISTS "OperationTask_driverId_status_idx" ON "OperationTask"("driverId", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserActivityLog_userId_fkey'
  ) THEN
    ALTER TABLE "UserActivityLog"
      ADD CONSTRAINT "UserActivityLog_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OperationTask_orderId_fkey'
  ) THEN
    ALTER TABLE "OperationTask"
      ADD CONSTRAINT "OperationTask_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OperationTask_driverId_fkey'
  ) THEN
    ALTER TABLE "OperationTask"
      ADD CONSTRAINT "OperationTask_driverId_fkey"
      FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
