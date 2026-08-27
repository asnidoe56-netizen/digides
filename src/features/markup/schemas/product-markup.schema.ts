import { z } from "zod";

export const productMarkupSchema = z.object({
  markupValue: z
    .number({ message: "Nominal markup wajib diisi" })
    .int("Nominal markup harus bilangan bulat")
    .nonnegative("Nominal markup tidak boleh negatif"),
});

export type ProductMarkupFormValues = z.infer<typeof productMarkupSchema>;

// Bulk-apply also carries whichever category/provider/status/search filter
// is currently active on the "Per Produk" tab — every matching product
// gets the same nominal in one action.
export const bulkProductMarkupSchema = z.object({
  markupValue: z.number({ message: "Nominal markup wajib diisi" }).int().nonnegative(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  status: z.enum(["ACTIVE", "GANGGUAN", "DISABLED"]).optional(),
  search: z.string().trim().max(200).optional(),
});

export type BulkProductMarkupFormValues = z.infer<typeof bulkProductMarkupSchema>;
