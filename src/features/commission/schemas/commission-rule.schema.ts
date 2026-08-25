import { z } from "zod";

export const commissionRuleSchema = z.object({
  level: z.number({ message: "Level wajib diisi" }).int("Level harus bilangan bulat").min(1, "Level minimal 1"),
  percentage: z
    .number({ message: "Persentase wajib diisi" })
    .min(0, "Persentase tidak boleh negatif")
    .max(100, "Persentase maksimal 100"),
  minTransaction: z.number().nonnegative("Minimal transaksi tidak boleh negatif").optional().nullable(),
  minPayout: z.number().nonnegative("Minimal payout tidak boleh negatif").default(0),
  holdingPeriodDays: z.number().int("Harus bilangan bulat").nonnegative("Tidak boleh negatif").default(0),
  eligibleCategoryId: z.string().uuid().optional().nullable(),
  maxCommission: z.number().nonnegative("Maksimal komisi tidak boleh negatif").optional().nullable(),
});

export type CommissionRuleFormValues = z.infer<typeof commissionRuleSchema>;
