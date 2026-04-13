import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "Ad gereklidir"),
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalıdır")
    .regex(/[A-Z]/, "En az bir büyük harf içermelidir")
    .regex(/[0-9]/, "En az bir rakam içermelidir"),
  role: z.enum(["ADMIN", "DISPATCHER", "DRIVER"]).default("DISPATCHER"),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .optional()
    .nullable(),
  role: z.enum(["ADMIN", "DISPATCHER", "DRIVER"]).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
