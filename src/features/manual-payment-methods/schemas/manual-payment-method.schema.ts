import { z } from "zod";

export const manualPaymentMethodSchema = z.object({
  displayName: z.string().trim().min(1, "Wajib diisi"),
  accountNumber: z.string().trim().min(1, "Wajib diisi"),
  accountName: z.string().trim().min(1, "Wajib diisi"),
});

export type ManualPaymentMethodFormValues = z.infer<typeof manualPaymentMethodSchema>;
