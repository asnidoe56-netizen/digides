import { z } from "zod";

// Shared between UserEditProfileDialog (client, for UX) and PATCH
// /api/users/[id]/profile (server, the actual boundary). Phone stays
// optional here — this form is also how a user who registered without
// one (e.g. self-signed-up AFFILIATE) gets it added later, not just for
// mitra accounts where it's required up front.
export const updateUserProfileSchema = z.object({
  fullName: z.string().trim().min(3, "Nama minimal 3 karakter").max(120),
  email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .regex(/^08[0-9]{8,12}$/, "Nomor WhatsApp tidak valid — gunakan format 08xxxxxxxxxx.")
    .optional()
    .or(z.literal("")),
});

export type UpdateUserProfileValues = z.infer<typeof updateUserProfileSchema>;
