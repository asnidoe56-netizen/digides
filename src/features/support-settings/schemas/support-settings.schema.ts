import { z } from "zod";

// Plain shape validation only — normalizeWhatsappNumber (below) does the
// actual digit cleanup, kept separate so this schema's output type stays
// the same shape RHF's defaultValues need (no transform to fight
// zodResolver over), same "form schema vs. server-side processing" split
// register.schema.ts uses.
export const supportSettingsFormSchema = z.object({
  whatsapp_number: z
    .string()
    .trim()
    .min(1, "Nomor WhatsApp wajib diisi")
    .regex(/^\+?[0-9 .-]{8,20}$/, "Nomor WhatsApp tidak valid"),
});

export type SupportSettingsFormValues = z.infer<typeof supportSettingsFormSchema>;

// Accepts whatever shape an admin naturally types a WhatsApp number in
// ("08137744419", "+62 813-7744-419", "62813...") and normalizes it to
// the plain international format (no leading 0 or +) that a wa.me link
// needs — so every reader of support_settings.whatsapp_number can build
// `https://wa.me/${number}` directly, with no normalization logic of its
// own to keep in sync. Returns null when the digits don't look like a
// plausible Indonesian number at all.
export function normalizeWhatsappNumber(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!/^(0|62)[0-9]{8,14}$/.test(digits)) return null;
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}
