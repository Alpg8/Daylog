import { z } from "zod";

export const createDriverSchema = z.object({
  fullName: z.string().min(1, "Ad Soyad gereklidir"),
  phoneNumber: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
  passportRemainingDays: z.number().int().optional().nullable(),
  passportExpiryDate: z.string().optional().nullable(),
  licenseRemainingDays: z.number().int().optional().nullable(),
  licenseExpiryDate: z.string().optional().nullable(),
  psychotechnicRemainingDays: z.number().int().optional().nullable(),
  psychotechnicExpiryDate: z.string().optional().nullable(),
  assignedVehicleId: z.string().uuid().optional().nullable(),
  usageType: z.string().optional().nullable(),
  ownershipType: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export const updateDriverSchema = createDriverSchema.partial();

export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>;
