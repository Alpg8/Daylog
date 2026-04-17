import { z } from "zod";

export const createOrderSchema = z.object({
  orderCategory: z.enum(["DOMESTIC", "IMPORT", "EXPORT"]),
  tradeType: z.enum(["ITH", "IHR"]).optional().nullable(),
  serialNumber: z.number().int().optional().nullable(),
  positionNumber: z.string().optional().nullable(),
  loadingDate: z.string().optional().nullable(),
  unloadingDate: z.string().optional().nullable(),
  operationDate: z.string().optional().nullable(),
  pickupLocation: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  transportType: z.string().optional().nullable(),
  cargoNumber: z.string().optional().nullable(),
  tripNumber: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  routeText: z.string().optional().nullable(),
  cmrStatus: z.string().optional().nullable(),
  documentStatus: z.string().optional().nullable(),
  spanzetStanga: z.string().optional().nullable(),
  remaining: z.string().optional().nullable(),
  cita: z.string().optional().nullable(),
  vehicleId: z.string().uuid().optional().nullable(),
  trailerId: z.string().uuid().optional().nullable(),
  driverId: z.string().uuid().optional().nullable(),
  status: z.enum(["PENDING", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("PENDING"),
  notes: z.string().optional().nullable(),

  // Ortak
  jobType: z.enum(["LOADING", "UNLOADING"]).default("LOADING"),
  sender: z.string().optional().nullable(),
  recipient: z.string().optional().nullable(),
  customs: z.string().optional().nullable(),
  loadingAddress: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  phaseStartLocation: z.string().optional().nullable(),
  phaseLoadLocation: z.string().optional().nullable(),
  phaseUnloadLocation: z.string().optional().nullable(),
  phaseDeliveryLocation: z.string().optional().nullable(),

  // EXPORT
  borderExitDate: z.string().optional().nullable(),
  customsGate: z.string().optional().nullable(),
  loadingCountry: z.string().optional().nullable(),
  unloadingCountry: z.string().optional().nullable(),
  waitingPrice: z.number().optional().nullable(),
  freightPrice: z.number().optional().nullable(),
  customsCost: z.number().optional().nullable(),
  supplyPrice: z.number().optional().nullable(),

  // IMPORT
  supply: z.string().optional().nullable(),
  loadingCity: z.string().optional().nullable(),
  unloadingCity: z.string().optional().nullable(),
  unloadingWarehouse: z.string().optional().nullable(),
  orderNumber: z.string().optional().nullable(),
  purchasePrice: z.number().optional().nullable(),
  salePrice: z.number().optional().nullable(),
  t2MrnNo: z.string().optional().nullable(),

  // DOMESTIC
  rental: z.string().optional().nullable(),
  containerTrailerNo: z.string().optional().nullable(),
  containerPickupAddress: z.string().optional().nullable(),
  loadUnloadLocation: z.string().optional().nullable(),
  containerDropAddress: z.string().optional().nullable(),
  deliveryCustomer: z.string().optional().nullable(),
  waitingDays: z.number().int().optional().nullable(),
  freightSalePrice: z.number().optional().nullable(),
  waitingCustomsPrice: z.number().optional().nullable(),
  customsKantarPrice: z.number().optional().nullable(),
  supplierSalePrice: z.number().optional().nullable(),
  transportProfitRate: z.number().optional().nullable(),
  supplierInfo: z.string().optional().nullable(),
  supplierPhone: z.string().optional().nullable(),
  equipmentInfo: z.string().optional().nullable(),
});

export const updateOrderSchema = createOrderSchema.partial();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
