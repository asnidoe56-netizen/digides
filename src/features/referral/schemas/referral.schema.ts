import { z } from "zod";

export const generateReferralCodeSchema = z.object({
  userId: z.string().uuid("Pengguna tidak valid"),
  customCode: z
    .string()
    .trim()
    .min(4, "Kode minimal 4 karakter")
    .max(20, "Kode maksimal 20 karakter")
    .regex(/^[A-Za-z0-9]+$/, "Kode hanya boleh huruf dan angka")
    .optional()
    .or(z.literal("")),
});

export type GenerateReferralCodeFormValues = z.infer<typeof generateReferralCodeSchema>;
