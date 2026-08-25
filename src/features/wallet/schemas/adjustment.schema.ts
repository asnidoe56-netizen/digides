import { z } from "zod";

// Shared between the Adjustment dialog (client, UX) and
// POST /api/wallet/[id]/adjustment (server, the real check). Issue M18
// section 13-14: adjustment always requires a reason, and the amount is
// signed (positive credits, negative debits).
export const adjustmentSchema = z.object({
  amount: z
    .number({ message: "Nominal wajib diisi" })
    .refine((value) => value !== 0, "Nominal tidak boleh nol"),
  reason: z.string().trim().min(5, "Alasan minimal 5 karakter").max(500),
});

export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;
