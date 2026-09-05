import { z } from "zod";

export const manualTopupDestinationSchema = z.object({
  danaNumber: z.string().trim().min(1, "Wajib diisi"),
  danaAccountName: z.string().trim().min(1, "Wajib diisi"),
  bankName: z.string().trim().min(1, "Wajib diisi"),
  bankAccountNumber: z.string().trim().min(1, "Wajib diisi"),
  bankAccountName: z.string().trim().min(1, "Wajib diisi"),
});

export type ManualTopupDestinationFormValues = z.infer<typeof manualTopupDestinationSchema>;
