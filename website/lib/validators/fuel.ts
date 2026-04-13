import { z } from "zod";

export const createFuelRecordSchema = z.object({
  vehicleId: z.string().uuid("Geçerli bir araç seçin"),
  driverId: z.string().uuid().optional().nullable(),
  date: z.string().min(1, "Tarih gereklidir"),
  fuelStation: z.string().optional().nullable(),
  liters: z.number().positive().optional().nullable(),
  pricePerLiter: z.number().optional().nullable(),
  totalCost: z.number().optional().nullable(),
  startKm: z.number().int().optional().nullable(),
  endKm: z.number().int().optional().nullable(),
  distanceKm: z.number().int().optional().nullable(),
  fuelType: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  currency: z.string().optional().nullable(),
  tankInLiters: z.number().optional().nullable(),
  tankRight: z.number().optional().nullable(),
  tankLeft: z.number().optional().nullable(),
  tankTotal: z.number().optional().nullable(),
  tankOutLiters: z.number().optional().nullable(),
  consumptionLiters: z.number().optional().nullable(),
  averageConsumption: z.number().optional().nullable(),
  monthStartKm: z.number().int().optional().nullable(),
  monthEndKm: z.number().int().optional().nullable(),
  monthTotalKm: z.number().int().optional().nullable(),
  monthFuelIn: z.number().optional().nullable(),
  monthFuelOut: z.number().optional().nullable(),
  fuelPurchased: z.number().optional().nullable(),
  fuelUsed: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateFuelRecordSchema = createFuelRecordSchema.partial();

export type CreateFuelRecordInput = z.infer<typeof createFuelRecordSchema>;
export type UpdateFuelRecordInput = z.infer<typeof updateFuelRecordSchema>;
