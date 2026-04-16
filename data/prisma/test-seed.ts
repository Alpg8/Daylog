/**
 * Test data seeder – creates:
 *   • test user  (DRIVER role)
 *   • test driver profile  linked to that user
 *   • a vehicle + trailer
 *   • an order  (EXPORT, IN_PROGRESS) assigned to that driver
 *   • DriverEvents for all 3 phases  (START_JOB → LOAD → DELIVERY/END_JOB)
 *   • notes on every event
 *
 * Safe to re-run – uses upsert / findFirst guards.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Creating test data…\n");

  // ── 1. Test User (DRIVER role) ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Test12345!", 12);

  const testUser = await prisma.user.upsert({
    where: { email: "test.surucu@daylog.com" },
    update: { passwordHash, isActive: true },
    create: {
      name: "Test Sürücü",
      email: "test.surucu@daylog.com",
      passwordHash,
      role: "DRIVER",
      isActive: true,
    },
  });
  console.log(`✅ User:    ${testUser.email}  (id: ${testUser.id})`);

  // ── 2. Vehicle ────────────────────────────────────────────────────────────
  const vehicle = await prisma.vehicle.upsert({
    where: { plateNumber: "34 TEST 001" },
    update: {
      brand: "MERCEDES",
      model: "ACTROS 1851",
      capacity: "24000 kg",
      maintenanceExpiry: new Date("2026-11-15"),
      notes: "2020 model, son muayene Kasım 2025. Lastik değişimi Mart 2026'da yapıldı. Club araç.",
    },
    create: {
      plateNumber: "34 TEST 001",
      usageType: "YURTDISI",
      ownershipType: "OZMAL",
      brand: "MERCEDES",
      model: "ACTROS 1851",
      capacity: "24000 kg",
      status: "ON_ROUTE",
      maintenanceExpiry: new Date("2026-11-15"),
      notes: "2020 model, son muayene Kasım 2025. Lastik değişimi Mart 2026'da yapıldı. Club araç.",
    },
  });
  console.log(`✅ Vehicle: ${vehicle.plateNumber}  (id: ${vehicle.id})`);

  // ── 3. Trailer ────────────────────────────────────────────────────────────
  const trailer = await prisma.trailer.upsert({
    where: { plateNumber: "34 TEST TY1" },
    update: {
      type: "TENTELI",
      notes: "Schmitz marka tenteli dorse. Karantina standı mevcut. Son muayene Ekim 2025.",
    },
    create: {
      plateNumber: "34 TEST TY1",
      type: "TENTELI",
      status: "IN_USE",
      notes: "Schmitz marka tenteli dorse. Karantina standı mevcut. Son muayene Ekim 2025.",
    },
  });
  console.log(`✅ Trailer: ${trailer.plateNumber}  (id: ${trailer.id})`);

  // ── 4. Driver profile linked to test user ────────────────────────────────
  let driver = await prisma.driver.findFirst({ where: { userId: testUser.id } });
  if (!driver) {
    driver = await prisma.driver.create({
      data: {
        userId: testUser.id,
        fullName: "Test Sürücü",
        phoneNumber: "+90 555 000 0001",
        nationalId: "99999999901",
        assignedVehicleId: vehicle.id,
        usageType: "YURTDISI",
        ownershipType: "OZMAL",
        isActive: true,
        passportExpiryDate: new Date("2028-03-20"),
        licenseExpiryDate: new Date("2027-08-15"),
        psychotechnicExpiryDate: new Date("2026-09-10"),
        notes: "Yurt dışı deneyimli sürücü. D sınıfı ehliyet sahibi. Aktif pasaport mevcut. Test amaçlı hesap.",
      },
    });
  } else {
    driver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        assignedVehicleId: vehicle.id,
        isActive: true,
        passportExpiryDate: new Date("2028-03-20"),
        licenseExpiryDate: new Date("2027-08-15"),
        psychotechnicExpiryDate: new Date("2026-09-10"),
        notes: "Yurt dışı deneyimli sürücü. D sınıfı ehliyet sahibi. Aktif pasaport mevcut. Test amaçlı hesap.",
      },
    });
  }
  console.log(`✅ Driver:  ${driver.fullName}  (id: ${driver.id})`);

  // ── 5. Order ──────────────────────────────────────────────────────────────
  let order = await prisma.order.findFirst({
    where: {
      driverId: driver.id,
      referenceNumber: "TEST-2026-001",
    },
  });
  if (!order) {
    order = await prisma.order.create({
      data: {
        orderCategory: "EXPORT",
        jobType: "LOADING",
        status: "IN_PROGRESS",
        referenceNumber: "TEST-2026-001",
        companyName: "Test Lojistik A.Ş.",
        customerName: "Test Customer GmbH",
        pickupLocation: "İstanbul, Türkiye",
        loadingAddress: "Gebze OSB, Kocaeli",
        deliveryAddress: "München, Deutschland",
        routeText: "İstanbul → Edirne → Sofya → Belgrad → Viyana → Münih",
        operationDate: new Date("2026-04-17"),
        loadingDate: new Date("2026-04-17"),
        unloadingDate: new Date("2026-04-22"),
        sender: "Test Fabrika Ltd.",
        recipient: "Test Müşteri GmbH",
        customs: "Kapıkule",
        vehicleId: vehicle.id,
        trailerId: trailer.id,
        driverId: driver.id,
        transportType: "Karayolu",
        notes: "Bu sipariş test amaçlıdır. Tüm aşama gönderimleri burada izlenebilir.",
        // EXPORT fields
        loadingCountry: "Türkiye",
        unloadingCountry: "Almanya",
        freightPrice: 2500,
        waitingPrice: 150,
      },
    });
  }
  console.log(`✅ Order:   ${order.referenceNumber}  (id: ${order.id})`);

  // ── 6. Driver Events – 3 Phases ──────────────────────────────────────────
  const existingEvents = await prisma.driverEvent.findMany({
    where: { orderId: order.id, driverId: driver.id },
    select: { type: true },
  });
  const existingTypes = new Set(existingEvents.map((e) => e.type));

  // Phase 1 – Başlangıç (START_JOB)
  if (!existingTypes.has("START_JOB")) {
    await prisma.driverEvent.create({
      data: {
        orderId: order.id,
        driverId: driver.id,
        createdById: testUser.id,
        type: "START_JOB",
        severity: "NORMAL",
        title: "Başlangıç",
        notes:
          "Araç hazır, yola çıkıyorum. Araç muayenesi yapıldı, eksik yok. Lastikler kontrol edildi, yağ seviyeleri normal.",
        eventAt: new Date("2026-04-17T06:30:00Z"),
      },
    });
    console.log("✅ Event:   START_JOB – Başlangıç fazı");
  }

  // Phase 2 – Yükleme (LOAD)
  if (!existingTypes.has("LOAD")) {
    await prisma.driverEvent.create({
      data: {
        orderId: order.id,
        driverId: driver.id,
        createdById: testUser.id,
        type: "LOAD",
        severity: "NORMAL",
        title: "Yükleme",
        notes:
          "Yükleme tamamlandı. 22 palet, toplam 14.200 kg. Ambalajlar sağlam, CMR imzalandı. Çekici üzerine yük sabitlendi.",
        eventAt: new Date("2026-04-17T09:45:00Z"),
      },
    });
    console.log("✅ Event:   LOAD – Yükleme fazı");
  }

  // Phase 2b – Waiting (during transit)
  if (!existingTypes.has("WAITING")) {
    await prisma.driverEvent.create({
      data: {
        orderId: order.id,
        driverId: driver.id,
        createdById: testUser.id,
        type: "WAITING",
        severity: "WARNING",
        title: "Gümrük Bekleme",
        notes:
          "Kapıkule sınırında bekliyorum. Gümrük yoğunluğu var, tahmini 3-4 saat bekleme süresi. Evraklar eksiksiz.",
        eventAt: new Date("2026-04-18T14:00:00Z"),
      },
    });
    console.log("✅ Event:   WAITING – Gümrük bekleme");
  }

  // Phase 3 – Teslim (DELIVERY)
  if (!existingTypes.has("DELIVERY")) {
    await prisma.driverEvent.create({
      data: {
        orderId: order.id,
        driverId: driver.id,
        createdById: testUser.id,
        type: "DELIVERY",
        severity: "NORMAL",
        title: "Teslimat",
        notes:
          "Teslimat tamamlandı. Alıcı imzayı attı. Yük eksiksiz teslim edildi. Dönüş için talimat bekliyorum.",
        eventAt: new Date("2026-04-22T11:20:00Z"),
      },
    });
    console.log("✅ Event:   DELIVERY – Teslim fazı");
  }

  // Phase 3b – End Job
  if (!existingTypes.has("END_JOB")) {
    await prisma.driverEvent.create({
      data: {
        orderId: order.id,
        driverId: driver.id,
        createdById: testUser.id,
        type: "END_JOB",
        severity: "NORMAL",
        title: "İş Sonu",
        notes:
          "Görev tamamlandı. Evraklar teslim edildi. Araç boşaltıldı.",
        eventAt: new Date("2026-04-22T12:00:00Z"),
      },
    });
    console.log("✅ Event:   END_JOB – İş bitiş");
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────");
  console.log("  TEST HESAP BİLGİLERİ");
  console.log("─────────────────────────────────────────");
  console.log(`  E-posta   : test.surucu@daylog.com`);
  console.log(`  Şifre     : Test12345!`);
  console.log(`  Rol       : DRIVER`);
  console.log(`  Sipariş   : TEST-2026-001  (id: ${order.id})`);
  console.log(`  Araç      : 34 TEST 001`);
  console.log(`  Dorse     : 34 TEST TY1`);
  console.log("─────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
