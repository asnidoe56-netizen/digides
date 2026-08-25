import { z } from "zod";

export const categoryMarkupSchema = z.object({
  markupValue: z
    .number({ message: "Nominal markup wajib diisi" })
    .int("Nominal markup harus bilangan bulat")
    .nonnegative("Nominal markup tidak boleh negatif"),
});

export type CategoryMarkupFormValues = z.infer<typeof categoryMarkupSchema>;
