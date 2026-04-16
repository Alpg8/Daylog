import { z } from "zod";

export const driverEventTypeSchema = z.enum([
  "START_JOB",
  "LOAD",
  "UNLOAD",
  "DELIVERY",
  "WAITING",
  "ISSUE",
  "HANDOVER",
  "END_JOB",
  "START_SHIFT",
  "END_SHIFT",
]);

export const driverEventSeveritySchema = z.enum(["NORMAL", "WARNING", "CRITICAL"]);

export const createDriverEventSchema = z.object({
  orderId: z.string().uuid(),
  type: driverEventTypeSchema,
  severity: driverEventSeveritySchema.default("NORMAL"),
  title: z.string().min(1).max(140).optional().nullable(),
  notes: z.string().max(3000).optional().nullable(),
  odometerKm: z.number().int().nonnegative().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  eventAt: z.string().datetime().optional().nullable(),
  // Phase-specific structured data from driver
  phaseData: z.record(z.unknown()).optional().nullable(),
});

export const driverConfirmationTypeSchema = z.enum([
  "JOB_STARTED",
  "LOADING_CONFIRMED",
  "DELIVERY_CONFIRMED",
  "VEHICLE_HANDED_OVER",
  "DELIVERY_RECEIVED",
  "DOCUMENT_UPLOADED",
  "DAMAGE_CONFIRMED",
]);

export const createDriverConfirmationSchema = z.object({
  orderId: z.string().uuid(),
  eventId: z.string().uuid().optional().nullable(),
  type: driverConfirmationTypeSchema,
  statement: z.string().min(2).max(400),
  status: z.enum(["PENDING", "CONFIRMED", "REJECTED"]).default("PENDING"),
  confirmedAt: z.string().datetime().optional().nullable(),
});

export const createHandoverSchema = z.object({
  orderId: z.string().uuid(),
  toDriverId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  handoverAt: z.string().datetime().optional().nullable(),
  status: z.enum(["PENDING", "ACCEPTED", "REJECTED"]).default("PENDING"),
});

export type CreateDriverEventInput = z.infer<typeof createDriverEventSchema>;
export type CreateDriverConfirmationInput = z.infer<typeof createDriverConfirmationSchema>;
export type CreateHandoverInput = z.infer<typeof createHandoverSchema>;
