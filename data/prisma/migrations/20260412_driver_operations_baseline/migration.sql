-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DISPATCHER', 'DRIVER');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'ON_ROUTE', 'MAINTENANCE', 'PASSIVE');

-- CreateEnum
CREATE TYPE "TrailerStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'SOLD');

-- CreateEnum
CREATE TYPE "OrderCategory" AS ENUM ('DOMESTIC', 'IMPORT', 'EXPORT');

-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('ITH', 'IHR');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR', 'TASK');

-- CreateEnum
CREATE TYPE "DriverEventType" AS ENUM ('START_JOB', 'LOAD', 'UNLOAD', 'DELIVERY', 'WAITING', 'ISSUE', 'HANDOVER', 'END_JOB', 'START_SHIFT', 'END_SHIFT');

-- CreateEnum
CREATE TYPE "DriverEventSeverity" AS ENUM ('NORMAL', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DriverConfirmationType" AS ENUM ('JOB_STARTED', 'LOADING_CONFIRMED', 'DELIVERY_CONFIRMED', 'VEHICLE_HANDED_OVER', 'DELIVERY_RECEIVED', 'DOCUMENT_UPLOADED', 'DAMAGE_CONFIRMED');

-- CreateEnum
CREATE TYPE "DriverConfirmationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "HandoverStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "usageType" TEXT,
    "ownershipType" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "capacity" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trailer" (
    "id" TEXT NOT NULL,
    "plateNumber" TEXT NOT NULL,
    "type" TEXT,
    "status" "TrailerStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "nationalId" TEXT,
    "passportRemainingDays" INTEGER,
    "passportExpiryDate" TIMESTAMP(3),
    "licenseRemainingDays" INTEGER,
    "licenseExpiryDate" TIMESTAMP(3),
    "psychotechnicRemainingDays" INTEGER,
    "psychotechnicExpiryDate" TIMESTAMP(3),
    "assignedVehicleId" TEXT,
    "usageType" TEXT,
    "ownershipType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "serialNumber" INTEGER,
    "orderCategory" "OrderCategory" NOT NULL,
    "tradeType" "TradeType",
    "positionNumber" TEXT,
    "loadingDate" TIMESTAMP(3),
    "unloadingDate" TIMESTAMP(3),
    "operationDate" TIMESTAMP(3),
    "pickupLocation" TEXT,
    "companyName" TEXT,
    "customerName" TEXT,
    "referenceNumber" TEXT,
    "transportType" TEXT,
    "cargoNumber" TEXT,
    "tripNumber" TEXT,
    "invoiceNumber" TEXT,
    "routeText" TEXT,
    "cmrStatus" TEXT,
    "documentStatus" TEXT,
    "spanzetStanga" TEXT,
    "remaining" TEXT,
    "cita" TEXT,
    "vehicleId" TEXT,
    "trailerId" TEXT,
    "driverId" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sender" TEXT,
    "recipient" TEXT,
    "customs" TEXT,
    "borderExitDate" TIMESTAMP(3),
    "customsGate" TEXT,
    "loadingCountry" TEXT,
    "unloadingCountry" TEXT,
    "waitingPrice" DOUBLE PRECISION,
    "freightPrice" DOUBLE PRECISION,
    "customsCost" DOUBLE PRECISION,
    "supplyPrice" DOUBLE PRECISION,
    "supply" TEXT,
    "loadingCity" TEXT,
    "unloadingCity" TEXT,
    "unloadingWarehouse" TEXT,
    "orderNumber" TEXT,
    "purchasePrice" DOUBLE PRECISION,
    "salePrice" DOUBLE PRECISION,
    "t2MrnNo" TEXT,
    "rental" TEXT,
    "containerTrailerNo" TEXT,
    "containerPickupAddress" TEXT,
    "loadUnloadLocation" TEXT,
    "containerDropAddress" TEXT,
    "deliveryCustomer" TEXT,
    "waitingDays" INTEGER,
    "freightSalePrice" DOUBLE PRECISION,
    "waitingCustomsPrice" DOUBLE PRECISION,
    "customsKantarPrice" DOUBLE PRECISION,
    "supplierSalePrice" DOUBLE PRECISION,
    "transportProfitRate" DOUBLE PRECISION,
    "supplierInfo" TEXT,
    "supplierPhone" TEXT,
    "equipmentInfo" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelRecord" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "fuelStation" TEXT,
    "liters" DOUBLE PRECISION,
    "pricePerLiter" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION,
    "startKm" INTEGER,
    "endKm" INTEGER,
    "distanceKm" INTEGER,
    "fuelType" TEXT,
    "paymentMethod" TEXT,
    "country" TEXT,
    "city" TEXT,
    "currency" TEXT,
    "tankInLiters" DOUBLE PRECISION,
    "tankRight" DOUBLE PRECISION,
    "tankLeft" DOUBLE PRECISION,
    "tankTotal" DOUBLE PRECISION,
    "tankOutLiters" DOUBLE PRECISION,
    "consumptionLiters" DOUBLE PRECISION,
    "averageConsumption" DOUBLE PRECISION,
    "monthStartKm" INTEGER,
    "monthEndKm" INTEGER,
    "monthTotalKm" INTEGER,
    "monthFuelIn" DOUBLE PRECISION,
    "monthFuelOut" DOUBLE PRECISION,
    "fuelPurchased" DOUBLE PRECISION,
    "fuelUsed" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "trailerId" TEXT,
    "orderId" TEXT,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "createdById" TEXT,
    "type" "DriverEventType" NOT NULL,
    "severity" "DriverEventSeverity" NOT NULL DEFAULT 'NORMAL',
    "title" TEXT,
    "notes" TEXT,
    "odometerKm" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "eventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverEventPhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverEventPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverConfirmation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "eventId" TEXT,
    "type" "DriverConfirmationType" NOT NULL,
    "status" "DriverConfirmationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "statement" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handover" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromDriverId" TEXT NOT NULL,
    "toDriverId" TEXT,
    "status" "HandoverStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "handoverAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Handover_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plateNumber_key" ON "Vehicle"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Trailer_plateNumber_key" ON "Trailer"("plateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_userId_key" ON "Driver"("userId");

-- CreateIndex
CREATE INDEX "DriverEvent_orderId_eventAt_idx" ON "DriverEvent"("orderId", "eventAt");

-- CreateIndex
CREATE INDEX "DriverEvent_driverId_eventAt_idx" ON "DriverEvent"("driverId", "eventAt");

-- CreateIndex
CREATE INDEX "DriverEventPhoto_eventId_idx" ON "DriverEventPhoto"("eventId");

-- CreateIndex
CREATE INDEX "DriverConfirmation_orderId_confirmedAt_idx" ON "DriverConfirmation"("orderId", "confirmedAt");

-- CreateIndex
CREATE INDEX "DriverConfirmation_driverId_confirmedAt_idx" ON "DriverConfirmation"("driverId", "confirmedAt");

-- CreateIndex
CREATE INDEX "Handover_orderId_handoverAt_idx" ON "Handover"("orderId", "handoverAt");

-- CreateIndex
CREATE INDEX "Handover_fromDriverId_handoverAt_idx" ON "Handover"("fromDriverId", "handoverAt");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_assignedVehicleId_fkey" FOREIGN KEY ("assignedVehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "Trailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelRecord" ADD CONSTRAINT "FuelRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelRecord" ADD CONSTRAINT "FuelRecord_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "Trailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverEvent" ADD CONSTRAINT "DriverEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverEvent" ADD CONSTRAINT "DriverEvent_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverEvent" ADD CONSTRAINT "DriverEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverEventPhoto" ADD CONSTRAINT "DriverEventPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DriverEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverConfirmation" ADD CONSTRAINT "DriverConfirmation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverConfirmation" ADD CONSTRAINT "DriverConfirmation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverConfirmation" ADD CONSTRAINT "DriverConfirmation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "DriverEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_fromDriverId_fkey" FOREIGN KEY ("fromDriverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handover" ADD CONSTRAINT "Handover_toDriverId_fkey" FOREIGN KEY ("toDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

