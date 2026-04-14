import { z } from "zod";

const nullableString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().optional().nullable()
);

const nullableUuid = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().uuid().optional().nullable()
);

const nullableDateString = z.preprocess(
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

export const createDriverSchema = z.object({
  userId: nullableUuid,
  fullName: z.string().min(1, "Ad Soyad gereklidir"),
  phoneNumber: nullableString,
  nationalId: nullableString,
  passportRemainingDays: z.number().int().optional().nullable(),
  passportExpiryDate: nullableDateString,
  licenseRemainingDays: z.number().int().optional().nullable(),
  licenseExpiryDate: nullableDateString,
  psychotechnicRemainingDays: z.number().int().optional().nullable(),
  psychotechnicExpiryDate: nullableDateString,
  assignedVehicleId: nullableUuid,
  usageType: nullableUsageType,
  ownershipType: nullableOwnershipType,
  isActive: z.boolean().default(true),
  notes: nullableString,
});

export const updateDriverSchema = createDriverSchema.partial();

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
