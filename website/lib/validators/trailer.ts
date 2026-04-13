import { z } from "zod";

export const createTrailerSchema = z.object({
  plateNumber: z.string().min(1, "Plaka numarası gereklidir"),
  type: z.string().optional().nullable(),
  status: z.enum(["AVAILABLE", "IN_USE", "MAINTENANCE", "SOLD"]).default("AVAILABLE"),
  notes: z.string().optional().nullable(),
});

export const updateTrailerSchema = createTrailerSchema.partial();

export type CreateTrailerInput = z.infer<typeof createTrailerSchema>;
export type UpdateTrailerInput = z.infer<typeof updateTrailerSchema>;
