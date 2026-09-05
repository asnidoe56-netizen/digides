import { z } from "zod";

export const commissionRuleSchema = z
  .object({
    commissionType: z.enum(["PERCENTAGE", "FLAT"], { message: "Tipe komisi wajib dipilih" }),
    percentage: z.number().min(0, "Persentase tidak boleh negatif").max(100, "Persentase maksimal 100").optional().nullable(),
    flatAmount: z.number().nonnegative("Nominal tidak boleh negatif").optional().nullable(),
    appliesToHolderStatus: z.enum(["USER", "MITRA"]).optional().nullable(),
    minTransaction: z.number().nonnegative("Minimal transaksi tidak boleh negatif").optional().nullable(),
    minPayout: z.number().nonnegative("Minimal payout tidak boleh negatif").default(0),
    holdingPeriodDays: z.number().int("Harus bilangan bulat").nonnegative("Tidak boleh negatif").default(0),
    eligibleCategoryId: z.string().uuid().optional().nullable(),
    maxCommission: z.number().nonnegative("Maksimal komisi tidak boleh negatif").optional().nullable(),
  })
  .refine((value) => value.commissionType !== "PERCENTAGE" || value.percentage != null, {
    message: "Persentase wajib diisi untuk tipe Persentase",
    path: ["percentage"],
  })
  .refine((value) => value.commissionType !== "FLAT" || value.flatAmount != null, {
    message: "Nominal wajib diisi untuk tipe Nominal Tetap",
    path: ["flatAmount"],
  });

export type CommissionRuleFormValues = z.infer<typeof commissionRuleSchema>;
