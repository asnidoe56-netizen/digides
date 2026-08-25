import { z } from "zod";

export const topupRequestSchema = z.object({
  walletId: z.string().uuid("Wallet tidak valid"),
  amount: z.number({ message: "Nominal wajib diisi" }).positive("Nominal harus lebih besar dari nol"),
});

export type TopupRequestFormValues = z.infer<typeof topupRequestSchema>;

export const topupRejectSchema = z.object({
  reason: z.string().trim().min(3, "Alasan penolakan minimal 3 karakter").max(500),
});

export type TopupRejectFormValues = z.infer<typeof topupRejectSchema>;
