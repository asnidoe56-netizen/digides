import { z } from "zod";

export const categoryNameSchema = z.object({
  name: z.string().trim().min(2, "Nama kategori minimal 2 karakter").max(100),
});

export type CategoryNameFormValues = z.infer<typeof categoryNameSchema>;
