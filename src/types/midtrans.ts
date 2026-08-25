export type MidtransMode = "sandbox" | "production";

// A singleton row, same shape/reasoning as DigiflazzSettings — only the
// currently-active `mode`'s key pair is ever used.
export interface MidtransSettings {
  id: string;
  mode: MidtransMode;
  merchant_id: string | null;
  sandbox_server_key_encrypted: string | null;
  sandbox_client_key_encrypted: string | null;
  production_server_key_encrypted: string | null;
  production_client_key_encrypted: string | null;
  is_active: boolean;
  updated_at: Date;
}
