import { z } from "zod";

export const sendTopupSchema = z.object({
  amount: z
    .number({ message: "Nominal wajib diisi" })
    .positive("Nominal harus lebih besar dari nol"),
});

export type SendTopupFormValues = z.infer<typeof sendTopupSchema>;
