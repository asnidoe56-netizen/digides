import { z } from "zod";

// The fields the server actually persists. POST /api/auth/register
// validates against this directly — confirmPassword never leaves the
// browser, it exists purely to catch typos before submit.
export const registerServerSchema = z.object({
  full_name: z.string().trim().min(3, "Nama minimal 3 karakter").max(120),
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{9,15}$/, "Nomor HP harus 9-15 digit angka")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Password minimal 8 karakter").max(72),
});

export const registerFormSchema = registerServerSchema
  .extend({
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type RegisterServerInput = z.infer<typeof registerServerSchema>;
