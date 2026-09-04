-- Singleton settings row, same shape/reasoning as security_policies/
-- midtrans_settings — the WhatsApp number the "?" help button (Beranda,
-- Flutter mitra app) opens a chat to. Super Admin edits it from
-- Pengaturan > Bantuan; the number itself is stored already normalized to
-- international format (e.g. "6281377444419", no leading 0 or +) so every
-- reader can build a wa.me link directly without its own normalization
-- logic.
CREATE TABLE support_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

INSERT INTO support_settings (whatsapp_number) VALUES ('6281377444419');

CREATE TRIGGER trg_support_settings_updated_at
BEFORE UPDATE ON support_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
