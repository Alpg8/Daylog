import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ─── Admin User ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Admin12345!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@example.com",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });
  console.log("✅ Admin user created:", admin.email);

  const driverUserPasswordHash = await bcrypt.hash("Driver12345!", 12);
  const driverUser = await prisma.user.upsert({
    where: { email: "driver@example.com" },
    update: {
      name: "Driver User",
      role: "DRIVER",
      isActive: true,
      passwordHash: driverUserPasswordHash,
    },
    create: {
      name: "Driver User",
      email: "driver@example.com",
      passwordHash: driverUserPasswordHash,
      role: "DRIVER",
      isActive: true,
    },
  });
  console.log("✅ Driver user created:", driverUser.email);

  // ─── Vehicles ────────────────────────────────────────────────────────────────
  const vehicleData = [
    { plateNumber: "34 BLJ 541", usageType: "YURTDISI", ownershipType: "OZMAL", brand: "MERCEDES", model: "ACTROS", status: "AVAILABLE" as const },
    { plateNumber: "34 BLJ 637", usageType: "YURTDISI", ownershipType: "OZMAL", brand: "MERCEDES", model: "ACTROS", status: "ON_ROUTE" as const },
    { plateNumber: "34 BLJ 705", usageType: "YURTDISI", ownershipType: "OZMAL", brand: "VOLVO", model: "FH16", status: "ON_ROUTE" as const },
    { plateNumber: "34 DVZ 584", usageType: "YURTICI", ownershipType: "OZMAL", brand: "MAN", model: "TGX", status: "AVAILABLE" as const },
    { plateNumber: "34 TZ 6870", usageType: "YURTDISI", ownershipType: "KIRALIK", brand: "SCANIA", model: "R500", status: "MAINTENANCE" as const },
    { plateNumber: "34 BLJ 851", usageType: "YURTDISI", ownershipType: "OZMAL", brand: "MERCEDES", model: "ACTROS", status: "ON_ROUTE" as const },
  ];

  const vehicles: Record<string, Awaited<ReturnType<typeof prisma.vehicle.upsert>>> = {};
  for (const v of vehicleData) {
    const vehicle = await prisma.vehicle.upsert({
      where: { plateNumber: v.plateNumber },
      update: {},
      create: v,
    });
    vehicles[v.plateNumber] = vehicle;
  }
  console.log(`✅ ${Object.keys(vehicles).length} vehicles created`);

  // ─── Trailers ────────────────────────────────────────────────────────────────
  const trailerData = [
    { plateNumber: "34 TY 4259", type: "TENTELI", status: "AVAILABLE" as const },
    { plateNumber: "34 TY 4446", type: "TENTELI", status: "IN_USE" as const },
    { plateNumber: "34 TY 4736", type: "TENTELI", status: "IN_USE" as const },
    { plateNumber: "34 TY 4702", type: "TENTELI", status: "IN_USE" as const },
    { plateNumber: "34 TY 8793", type: "FRIGORIFIK", status: "AVAILABLE" as const },
    { plateNumber: "XA 219 MV", type: "TENTELI", status: "AVAILABLE" as const },
    { plateNumber: "XA 920 JR", type: "TENTELI", status: "AVAILABLE" as const },
  ];

  const trailers: Record<string, Awaited<ReturnType<typeof prisma.trailer.upsert>>> = {};
  for (const t of trailerData) {
    const trailer = await prisma.trailer.upsert({
      where: { plateNumber: t.plateNumber },
      update: {},
      create: t,
    });
    trailers[t.plateNumber] = trailer;
  }
  console.log(`✅ ${Object.keys(trailers).length} trailers created`);

  // ─── Drivers ─────────────────────────────────────────────────────────────────
  const driverData = [
    {
      fullName: "Tarkan İnce",
      phoneNumber: "+90 532 111 0001",
      assignedVehicleId: vehicles["34 BLJ 541"].id,
      usageType: "YURTDISI",
      ownershipType: "OZMAL",
      licenseExpiryDate: new Date("2027-06-15"),
      passportExpiryDate: new Date("2028-03-20"),
      psychotechnicExpiryDate: new Date("2026-09-10"),
      isActive: true,
    },
    {
      fullName: "Zihni Aslan",
      phoneNumber: "+90 532 111 0002",
      assignedVehicleId: vehicles["34 BLJ 637"].id,
      usageType: "YURTDISI",
      ownershipType: "OZMAL",
      licenseExpiryDate: new Date("2026-11-30"),
      passportExpiryDate: new Date("2027-08-14"),
      psychotechnicExpiryDate: new Date("2026-08-22"),
      isActive: true,
    },
    {
      fullName: "Emrah Ersöz",
      phoneNumber: "+90 532 111 0003",
      assignedVehicleId: vehicles["34 BLJ 705"].id,
      usageType: "YURTDISI",
      ownershipType: "OZMAL",
      licenseExpiryDate: new Date("2028-01-10"),
      passportExpiryDate: new Date("2029-05-07"),
      psychotechnicExpiryDate: new Date("2027-02-18"),
      isActive: true,
    },
    {
      fullName: "Nadir Miçoğulları",
      phoneNumber: "+90 532 111 0004",
      assignedVehicleId: vehicles["34 BLJ 851"].id,
      usageType: "YURTDISI",
      ownershipType: "OZMAL",
      licenseExpiryDate: new Date("2027-09-25"),
      passportExpiryDate: new Date("2028-12-01"),
      psychotechnicExpiryDate: new Date("2026-07-30"),
      isActive: true,
    },
    {
      fullName: "Niyazi Kalyoncu",
      phoneNumber: "+90 532 111 0005",
      assignedVehicleId: vehicles["34 DVZ 584"].id,
      usageType: "YURTICI",
      ownershipType: "OZMAL",
      licenseExpiryDate: new Date("2026-12-15"),
      passportExpiryDate: new Date("2027-03-08"),
      psychotechnicExpiryDate: new Date("2026-10-05"),
      isActive: true,
    },
  ];

  const drivers: Record<string, Awaited<ReturnType<typeof prisma.driver.create>>> = {};
  for (const d of driverData) {
    const existing = await prisma.driver.findFirst({ where: { fullName: d.fullName } });
    const driver = existing ?? await prisma.driver.create({ data: d });
    drivers[d.fullName] = driver;
  }

  // Map one active driver to the driver-role auth user for app login/smoke tests
  await prisma.driver.update({
    where: { id: drivers["Zihni Aslan"].id },
    data: { userId: driverUser.id },
  });

  console.log(`✅ ${Object.keys(drivers).length} drivers created`);

  // ─── Orders ──────────────────────────────────────────────────────────────────
  const ordersToCreate = [
    {
      orderCategory: "EXPORT" as const,
      tradeType: "IHR" as const,
      loadingDate: new Date("2026-03-07"),
      unloadingDate: new Date("2026-03-11"),
      vehicleId: vehicles["34 BLJ 637"].id,
      trailerId: trailers["34 TY 4446"].id,
      driverId: drivers["Zihni Aslan"].id,
      customerName: "LKW",
      referenceNumber: "1543/603/0001",
      transportType: "IHRACAT",
      cargoNumber: "DAY2600015EX",
      tripNumber: "DAY26OZ0011EX",
      invoiceNumber: "LAA2026000006",
      routeText: "TR-BG-RO-HU-AT-DE",
      status: "IN_PROGRESS" as const,
      createdByUserId: admin.id,
    },
    {
      orderCategory: "EXPORT" as const,
      tradeType: "IHR" as const,
      loadingDate: new Date("2026-03-09"),
      unloadingDate: new Date("2026-03-13"),
      vehicleId: vehicles["34 BLJ 705"].id,
      trailerId: trailers["34 TY 4736"].id,
      driverId: drivers["Emrah Ersöz"].id,
      customerName: "BLG",
      transportType: "IHRACAT",
      cargoNumber: "DAY2600016EX",
      tripNumber: "DAY26OZ0012EX",
      invoiceNumber: "LOG2026000019",
      routeText: "TR-BG-RO-HU-AT-DE",
      status: "PLANNED" as const,
      createdByUserId: admin.id,
    },
    {
      orderCategory: "EXPORT" as const,
      tradeType: "IHR" as const,
      loadingDate: new Date("2026-03-12"),
      unloadingDate: new Date("2026-03-16"),
      vehicleId: vehicles["34 BLJ 851"].id,
      trailerId: trailers["34 TY 4702"].id,
      driverId: drivers["Nadir Miçoğulları"].id,
      customerName: "GENEL TRANSPORT",
      referenceNumber: "YK.T.E.26.03.00304",
      transportType: "IHRACAT",
      cargoNumber: "DAY2600017EX",
      tripNumber: "DAY26OZ0013EX",
      invoiceNumber: "LOG2026000021",
      routeText: "TR-BG-RO-HU-AT-DE-NL",
      status: "PLANNED" as const,
      createdByUserId: admin.id,
    },
    {
      orderCategory: "EXPORT" as const,
      tradeType: "IHR" as const,
      loadingDate: new Date("2026-03-17"),
      unloadingDate: new Date("2026-03-21"),
      vehicleId: vehicles["34 BLJ 541"].id,
      trailerId: trailers["34 TY 4259"].id,
      driverId: drivers["Tarkan İnce"].id,
      customerName: "GENEL TRANSPORT",
      referenceNumber: "YK.T.E.26.03.00180",
      transportType: "IHRACAT",
      cargoNumber: "DAY2600018EX",
      tripNumber: "DAY26OZ0014EX",
      invoiceNumber: "LOG2026000022",
      routeText: "TR-BG-RO-HU-AT-DE-NL",
      status: "PENDING" as const,
      createdByUserId: admin.id,
    },
    {
      orderCategory: "IMPORT" as const,
      tradeType: "ITH" as const,
      operationDate: new Date("2024-01-02"),
      positionNumber: "01/24/0001-Y",
      pickupLocation: "PENDIK",
      companyName: "TASIS",
      vehicleId: vehicles["34 BLJ 541"].id,
      trailerId: trailers["XA 219 MV"].id,
      customerName: "INLAND",
      cmrStatus: "EKLENDI-ORJ GELDI",
      status: "COMPLETED" as const,
      createdByUserId: admin.id,
    },
    {
      orderCategory: "IMPORT" as const,
      tradeType: "ITH" as const,
      operationDate: new Date("2024-01-02"),
      positionNumber: "01/24/0002-Y",
      pickupLocation: "PENDIK",
      companyName: "TASIS",
      vehicleId: vehicles["34 DVZ 584"].id,
      trailerId: trailers["XA 920 JR"].id,
      customerName: "INLAND",
      cmrStatus: "EKLENDI-ORJ GELDI",
      status: "COMPLETED" as const,
      createdByUserId: admin.id,
    },
    {
      orderCategory: "DOMESTIC" as const,
      pickupLocation: "İSTANBUL",
      companyName: "ARAS KARGO",
      customerName: "İSTANBUL DEPO",
      transportType: "DAGİTIM",
      routeText: "İSTANBUL - ANKARA",
      vehicleId: vehicles["34 DVZ 584"].id,
      driverId: drivers["Niyazi Kalyoncu"].id,
      status: "COMPLETED" as const,
      createdByUserId: admin.id,
    },
    {
      orderCategory: "DOMESTIC" as const,
      pickupLocation: "ANKARA",
      companyName: "BOSCH",
      customerName: "BOSCH ANKARA",
      transportType: "KOMPLE",
      routeText: "ANKARA - İZMİR",
      vehicleId: vehicles["34 TZ 6870"].id,
      status: "PENDING" as const,
      createdByUserId: admin.id,
    },
  ];

  for (const order of ordersToCreate) {
    await prisma.order.create({ data: order });
  }
  console.log(`✅ ${ordersToCreate.length} orders created`);

  // ─── Fuel Records ────────────────────────────────────────────────────────────
  const fuelRecords = [
    {
      vehicleId: vehicles["34 DVZ 584"].id,
      driverId: drivers["Niyazi Kalyoncu"].id,
      date: new Date("2026-03-13"),
      fuelStation: "PETROL OFİSİ",
      liters: 240,
      startKm: 615235,
      endKm: 616242,
      distanceKm: 1007,
      tankInLiters: 432,
      tankRight: 15,
      tankTotal: 135,
      tankOutLiters: 375,
      consumptionLiters: 297,
      averageConsumption: 0.29493545,
    },
    {
      vehicleId: vehicles["34 DVZ 584"].id,
      driverId: drivers["Niyazi Kalyoncu"].id,
      date: new Date("2026-03-16"),
      fuelStation: "OPET",
      liters: 350,
      startKm: 616242,
      endKm: 617235,
      distanceKm: 993,
      tankInLiters: 375,
      tankRight: 9,
      tankTotal: 81,
      tankOutLiters: 431,
      consumptionLiters: 294,
      averageConsumption: 0.29607251,
    },
    {
      vehicleId: vehicles["34 BLJ 637"].id,
      driverId: drivers["Zihni Aslan"].id,
      date: new Date("2026-03-08"),
      fuelStation: "SHELL",
      liters: 420,
      startKm: 285000,
      endKm: 286400,
      distanceKm: 1400,
      tankInLiters: 580,
      tankTotal: 180,
      tankOutLiters: 560,
      consumptionLiters: 480,
      averageConsumption: 0.34285714,
    },
    {
      vehicleId: vehicles["34 BLJ 705"].id,
      driverId: drivers["Emrah Ersöz"].id,
      date: new Date("2026-03-10"),
      fuelStation: "TOTAL",
      liters: 380,
      startKm: 192000,
      endKm: 193200,
      distanceKm: 1200,
      tankTotal: 160,
      consumptionLiters: 400,
      averageConsumption: 0.33333333,
    },
    {
      vehicleId: vehicles["34 BLJ 541"].id,
      driverId: drivers["Tarkan İnce"].id,
      date: new Date("2026-03-18"),
      fuelStation: "BP",
      liters: 460,
      startKm: 445000,
      endKm: 446500,
      distanceKm: 1500,
      tankTotal: 200,
      consumptionLiters: 510,
      averageConsumption: 0.34,
    },
  ];

  for (const fuel of fuelRecords) {
    await prisma.fuelRecord.create({ data: fuel });
  }
  console.log(`✅ ${fuelRecords.length} fuel records created`);

  // ─── Notifications ───────────────────────────────────────────────────────────
  const notifications = [
    {
      userId: admin.id,
      title: "Yeni İhracat Siparişi",
      message: "DAY2600015EX no'lu ihracat siparişi Zihni Aslan'a atandı.",
      type: "SUCCESS" as const,
      isRead: false,
    },
    {
      userId: admin.id,
      title: "Araç Bakım Hatırlatması",
      message: "34 TZ 6870 plakalı araç bakım zamanı geldi.",
      type: "WARNING" as const,
      isRead: false,
    },
    {
      userId: admin.id,
      title: "Sürücü Belge Uyarısı",
      message: "Niyazi Kalyoncu'nun ehliyet süresi 90 gün içinde doluyor.",
      type: "WARNING" as const,
      isRead: true,
    },
    {
      userId: admin.id,
      title: "Yakıt Kaydı Eklendi",
      message: "34 DVZ 584 için yakıt kaydı başarıyla sisteme eklendi.",
      type: "SUCCESS" as const,
      isRead: true,
    },
    {
      userId: admin.id,
      title: "Sipariş Durumu Güncellendi",
      message: "DAY2600015EX siparişi IN_PROGRESS durumuna güncellendi.",
      type: "INFO" as const,
      isRead: false,
    },
    {
      userId: admin.id,
      title: "Yeni Görev Atandı",
      message: "Emrah Ersöz için yeni rota görevi oluşturuldu.",
      type: "TASK" as const,
      isRead: false,
    },
  ];

  for (const notif of notifications) {
    await prisma.notification.create({ data: notif });
  }
  console.log(`✅ ${notifications.length} notifications created`);

  // ─── Driver Operations Sample Flow ─────────────────────────────────────────
  const sampleOrder = await prisma.order.findFirst({
    where: {
      driverId: drivers["Zihni Aslan"].id,
      status: { in: ["PLANNED", "IN_PROGRESS"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (sampleOrder) {
    const existingStart = await prisma.driverEvent.findFirst({
      where: { orderId: sampleOrder.id, type: "START_JOB" },
    });

    const startEvent = existingStart ?? await prisma.driverEvent.create({
      data: {
        orderId: sampleOrder.id,
        driverId: drivers["Zihni Aslan"].id,
        createdById: driverUser.id,
        type: "START_JOB",
        notes: "Seed smoke test: ise baslandi",
      },
    });

    const existingLoad = await prisma.driverEvent.findFirst({
      where: { orderId: sampleOrder.id, type: "LOAD" },
    });

    const loadEvent = existingLoad ?? await prisma.driverEvent.create({
      data: {
        orderId: sampleOrder.id,
        driverId: drivers["Zihni Aslan"].id,
        createdById: driverUser.id,
        type: "LOAD",
        notes: "Seed smoke test: yukleme tamamlandi",
      },
    });

    const existingIssue = await prisma.driverEvent.findFirst({
      where: { orderId: sampleOrder.id, type: "ISSUE" },
    });

    if (!existingIssue) {
      await prisma.driverEvent.create({
        data: {
          orderId: sampleOrder.id,
          driverId: drivers["Zihni Aslan"].id,
          createdById: driverUser.id,
          type: "ISSUE",
          severity: "WARNING",
          notes: "Seed smoke test: gecikme bildirimi",
        },
      });
    }

    const existingStartConfirmation = await prisma.driverConfirmation.findFirst({
      where: { orderId: sampleOrder.id, type: "JOB_STARTED" },
    });

    if (!existingStartConfirmation) {
      await prisma.driverConfirmation.create({
        data: {
          orderId: sampleOrder.id,
          driverId: drivers["Zihni Aslan"].id,
          eventId: startEvent.id,
          type: "JOB_STARTED",
          statement: "Ise basladim",
          status: "CONFIRMED",
        },
      });
    }

    const existingLoadConfirmation = await prisma.driverConfirmation.findFirst({
      where: { orderId: sampleOrder.id, type: "LOADING_CONFIRMED" },
    });

    if (!existingLoadConfirmation) {
      await prisma.driverConfirmation.create({
        data: {
          orderId: sampleOrder.id,
          driverId: drivers["Zihni Aslan"].id,
          eventId: loadEvent.id,
          type: "LOADING_CONFIRMED",
          statement: "Yuklemeyi onayliyorum",
          status: "CONFIRMED",
        },
      });
    }

    const existingHandover = await prisma.handover.findFirst({
      where: { orderId: sampleOrder.id, fromDriverId: drivers["Zihni Aslan"].id },
    });

    if (!existingHandover) {
      await prisma.handover.create({
        data: {
          orderId: sampleOrder.id,
          fromDriverId: drivers["Zihni Aslan"].id,
          notes: "Seed smoke test: devir teslim kaydi",
          status: "PENDING",
        },
      });
    }

    console.log("✅ Driver operations sample flow created");
  }

  console.log("\n🎉 Seed completed successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📧 Admin email:    admin@example.com");
  console.log("🔑 Admin password: Admin12345!");
  console.log("📧 Driver email:   driver@example.com");
  console.log("🔑 Driver password: Driver12345!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
