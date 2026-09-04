import { z } from "zod";

// Same 6-digit shape every other transaction PIN field in the app uses
// (see change-pin.schema.ts / register-mitra.schema.ts) — a transaction
// PIN is always exactly 6 digits everywhere.
const pinField = (message: string) => z.string().regex(/^[0-9]{6}$/, message);

// The fields the server actually persists. POST /api/auth/register
// validates against this directly — confirmPassword/confirmPin never leave
// the browser, they exist purely to catch typos before submit. `pin`
// becomes this account's transaction PIN (user_transaction_pins) — without
// it a self-registered AFFILIATE would have no way to ever set one up,
// since Ganti PIN requires proving the *current* PIN first.
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
  pin: pinField("PIN harus 6 digit angka"),
  // An existing referral_codes.code — its owner becomes this account's
  // referrer in referral_relationships (mirrors register-mitra.schema.ts).
  referralCode: z.string().trim().max(50).optional().or(z.literal("")),
  // Pasal 39 of the Syarat & Ketentuan: registration may only proceed after
  // the user has agreed. The client shows the terms and only sends `true`
  // once the user taps "Saya Setuju" — the server still refuses anything
  // else, never trusting the client to have actually shown that screen.
  agreedToTerms: z.literal(true, {
    message: "Anda harus menyetujui Syarat & Ketentuan",
  }),
});

export const registerFormSchema = registerServerSchema
  .extend({
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
    confirmPin: pinField("Konfirmasi PIN harus 6 digit angka"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  })
  .refine((data) => data.pin === data.confirmPin, {
    message: "Konfirmasi PIN tidak cocok",
    path: ["confirmPin"],
  });

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type RegisterServerInput = z.infer<typeof registerServerSchema>;
