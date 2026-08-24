import { apiFetch } from "@/lib/api/client";
import type { DigiflazzSettingsFormValues } from "../schemas/digiflazz-settings.schema";

// What the PUT response actually looks like on the wire (JSON — dates
// arrive as strings). Not used as the initial-load shape; that comes
// straight from the server (see DigiflazzSettingsView in
// @/services/digiflazz.service, used as the Server Component -> Client
// Component prop type instead of duplicating it here).
interface DigiflazzSettingsResponse {
  username: string;
  base_url: string;
  mode: "development" | "production";
  is_active: boolean;
  dev_key_masked: string | null;
  prod_key_masked: string | null;
  updated_at: string;
}

// Save-only client — the initial masked settings are loaded by the
// Server Component page directly from digiflazz.service, never re-fetched
// over HTTP by the browser (see app/dashboard/super-admin/settings/page.tsx).
export function saveDigiflazzSettings(
  input: DigiflazzSettingsFormValues,
): Promise<DigiflazzSettingsResponse> {
  return apiFetch<DigiflazzSettingsResponse>("/api/digiflazz/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export interface DigiflazzConnectionTestResult {
  success: boolean;
  message: string;
  productCount?: number;
}

// Tests whatever credentials are currently saved in the database — not
// whatever's typed in the form, since an unsaved key never reaches the
// browser's JS in the first place.
export function testDigiflazzConnection(): Promise<DigiflazzConnectionTestResult> {
  return apiFetch<DigiflazzConnectionTestResult>("/api/digiflazz/test-connection", {
    method: "POST",
  });
}
