import { z } from "zod";

export const brandNameSchema = z.object({
  name: z.string().trim().min(2, "Nama brand minimal 2 karakter").max(100),
});

export type BrandNameFormValues = z.infer<typeof brandNameSchema>;
