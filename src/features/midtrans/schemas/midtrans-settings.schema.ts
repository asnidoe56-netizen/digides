import { z } from "zod";

// Same split as digiflazz-settings.schema.ts: the four key fields are
// optional because an empty value means "keep the key already stored,"
// never "erase it" — the UI never has the real key to redisplay anyway.
export const midtransSettingsServerSchema = z.object({
  mode: z.enum(["sandbox", "production"], { message: "Pilih mode sandbox atau production" }),
  merchant_id: z.string().trim().max(120).optional(),
  sandbox_server_key: z.string().trim().max(255).optional(),
  sandbox_client_key: z.string().trim().max(255).optional(),
  production_server_key: z.string().trim().max(255).optional(),
  production_client_key: z.string().trim().max(255).optional(),
});

export type MidtransSettingsFormValues = z.infer<typeof midtransSettingsServerSchema>;
