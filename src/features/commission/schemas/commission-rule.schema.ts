import { z } from "zod";

// One form sets both tiers' reward for one category at once — see
// commission.service.ts's saveCommissionRuleForCategory. Leaving an
// amount at 0/empty means that tier earns nothing for this category,
// not "use some other default".
export const commissionRuleSchema = z.object({
  eligibleCategoryId: z.string().uuid().optional().nullable(),
  commissionType: z.enum(["PERCENTAGE", "FLAT"], { message: "Tipe komisi wajib dipilih" }),
  userAmount: z.number().nonnegative("Tidak boleh negatif").optional().nullable(),
  mitraAmount: z.number().nonnegative("Tidak boleh negatif").optional().nullable(),
  minTransaction: z.number().nonnegative("Minimal transaksi tidak boleh negatif").optional().nullable(),
  minPayout: z.number().nonnegative("Minimal payout tidak boleh negatif").default(0),
  holdingPeriodDays: z.number().int("Harus bilangan bulat").nonnegative("Tidak boleh negatif").default(0),
  maxCommission: z.number().nonnegative("Maksimal komisi tidak boleh negatif").optional().nullable(),
});

export type CommissionRuleFormValues = z.infer<typeof commissionRuleSchema>;
