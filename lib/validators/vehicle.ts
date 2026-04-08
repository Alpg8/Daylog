import { z } from "zod";

export const createVehicleSchema = z.object({
  plateNumber: z.string().min(1, "Plaka numarası gereklidir"),
  usageType: z.string().optional().nullable(),
  ownershipType: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  capacity: z.string().optional().nullable(),
  status: z.enum(["AVAILABLE", "ON_ROUTE", "MAINTENANCE", "PASSIVE"]).default("AVAILABLE"),
  notes: z.string().optional().nullable(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
