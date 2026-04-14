import { z } from "zod";

const nullableString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().optional().nullable()
);

const nullableUsageType = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.enum(["YURTICI", "YURTDISI"]).optional().nullable()
);

const nullableOwnershipType = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.enum(["OZMAL", "KIRALIK"]).optional().nullable()
);

export const createVehicleSchema = z.object({
  plateNumber: z.string().min(1, "Plaka numarası gereklidir"),
  usageType: nullableUsageType,
  ownershipType: nullableOwnershipType,
  brand: nullableString,
  model: nullableString,
  capacity: nullableString,
  status: z.enum(["AVAILABLE", "ON_ROUTE", "MAINTENANCE", "PASSIVE"]).default("AVAILABLE"),
  notes: nullableString,
});

export const updateVehicleSchema = createVehicleSchema.partial();

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
