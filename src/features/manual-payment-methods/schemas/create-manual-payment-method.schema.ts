import { z } from "zod";

export const createManualPaymentMethodSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Wajib diisi")
    .max(20, "Maksimal 20 karakter")
    .regex(/^[A-Za-z0-9_ ]+$/, "Hanya huruf, angka, spasi, dan garis bawah"),
  displayName: z.string().trim().min(1, "Wajib diisi"),
  accountNumber: z.string().trim().min(1, "Wajib diisi"),
  accountName: z.string().trim().min(1, "Wajib diisi"),
});

export type CreateManualPaymentMethodFormValues = z.infer<typeof createManualPaymentMethodSchema>;
