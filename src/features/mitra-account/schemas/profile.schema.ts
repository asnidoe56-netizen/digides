import { z } from "zod";

// Same shape/rules as features/users/schemas/user-profile.schema.ts (the
// Super Admin "Edit Profil" counterpart) — both write to the exact same
// users row, so the validation a mitra sees editing their own profile
// must never be looser or stricter than what Super Admin sees editing it
// for them.
export const mitraProfileSchema = z.object({
  fullName: z.string().trim().min(3, "Nama minimal 3 karakter").max(120),
  email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .regex(/^08[0-9]{8,12}$/, "Nomor WhatsApp tidak valid — gunakan format 08xxxxxxxxxx.")
    .optional()
    .or(z.literal("")),
});

export type MitraProfileValues = z.infer<typeof mitraProfileSchema>;
