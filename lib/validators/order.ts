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
});

export const updateOrderSchema = createOrderSchema.partial();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
