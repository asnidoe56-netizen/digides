import { apiFetch } from "@/lib/api/client";
import type { SupportSettingsFormValues } from "../schemas/support-settings.schema";

export function saveSupportSettings(input: SupportSettingsFormValues) {
  return apiFetch<{ whatsapp_number: string }>("/api/settings/support", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
