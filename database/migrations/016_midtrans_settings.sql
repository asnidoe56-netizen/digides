-- Midtrans payment gateway credentials — same shape/reasoning as
-- digiflazz_settings (004_products.sql): a singleton row, one key pair per
-- environment (sandbox/production), only the currently-active `mode`'s
-- pair is ever used. Server keys are secret (used server-side to call
-- Midtrans's API and to verify webhook signatures) and client keys are
-- not secret (Snap.js needs one in the browser) but are still stored
-- encrypted here for a uniform "every credential column is encrypted"
-- rule — see src/lib/crypto/credentials.ts.
CREATE TABLE midtrans_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('sandbox', 'production')),
  merchant_id text,
  sandbox_server_key_encrypted text,
  sandbox_client_key_encrypted text,
  production_server_key_encrypted text,
  production_client_key_encrypted text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_midtrans_settings_updated_at
BEFORE UPDATE ON midtrans_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
