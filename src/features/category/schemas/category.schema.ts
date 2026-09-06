import { z } from "zod";

export const categoryNameSchema = z.object({
  name: z.string().trim().min(2, "Nama kategori minimal 2 karakter").max(100),
});

export type CategoryNameFormValues = z.infer<typeof categoryNameSchema>;

export const categoryDisplayNameSchema = z.object({
  displayName: z.string().trim().min(2, "Nama tampilan minimal 2 karakter").max(100),
});

export type CategoryDisplayNameFormValues = z.infer<typeof categoryDisplayNameSchema>;
