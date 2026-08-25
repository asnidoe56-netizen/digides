import { z } from "zod";

// The fields the server actually persists — confirmPassword never leaves
// the browser, same split as auth/register.schema.ts. There's no PIN
// confirmation field: the PIN is entered once, and referralCode links
// this Mitra to an existing referral_codes entry (its owner becomes the
// referrer in referral_relationships) — see bumdes.service.ts.
export const registerMitraServerSchema = z.object({
  name: z.string().trim().min(3, "Nama mitra minimal 3 karakter").max(120),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter").max(72),
  pin: z.string().regex(/^[0-9]{6}$/, "PIN harus 6 digit angka"),
  referralCode: z.string().trim().max(50).optional().or(z.literal("")),
});

export const registerMitraFormSchema = registerMitraServerSchema
  .extend({
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export type RegisterMitraFormValues = z.infer<typeof registerMitraFormSchema>;
export type RegisterMitraServerInput = z.infer<typeof registerMitraServerSchema>;
