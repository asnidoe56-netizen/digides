import { z } from "zod";

// Shared between DigiflazzSettingsForm (client, UX only) and
// PUT /api/digiflazz/settings (server, the real check) — issue M03
// section 16. dev_key/prod_key are optional: an empty value means "keep
// the key already stored," never "erase it" — the UI never has the real
// key to redisplay in the first place, so leaving a field blank has to
// mean "unchanged."
export const digiflazzSettingsServerSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi").max(120),
  base_url: z.string().trim().url("URL Digiflazz tidak valid"),
  mode: z.enum(["development", "production"], {
    message: "Pilih mode development atau production",
  }),
  dev_key: z.string().trim().max(255).optional(),
  prod_key: z.string().trim().max(255).optional(),
});

export type DigiflazzSettingsFormValues = z.infer<typeof digiflazzSettingsServerSchema>;
