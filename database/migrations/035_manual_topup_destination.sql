-- Which manual channel (DANA or bank transfer) a MANUAL payments row was
-- requested through — payments.method already covers gateway-vs-manual,
-- this is the finer-grained detail the Mitra app's payment-detail screen
-- and Super Admin's verification screen both need to know which account
-- to expect the money on. Null for QRIS/VA/MIDTRANS rows.
ALTER TABLE payments
  ADD COLUMN manual_channel text CHECK (manual_channel IN ('DANA', 'TRANSFER_BANK'));

-- Singleton settings row (same shape/reasoning as support_settings) — the
-- real DANA/bank account a Mitra transfers to when self-servicing a top
-- up request, since there's no payment gateway integration yet. Seeded
-- with placeholder values; Super Admin fills in the real ones from
-- Pengaturan before this is safe to actually use.
CREATE TABLE manual_topup_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dana_number text NOT NULL,
  dana_account_name text NOT NULL,
  bank_name text NOT NULL,
  bank_account_number text NOT NULL,
  bank_account_name text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

INSERT INTO manual_topup_destinations (
  dana_number, dana_account_name, bank_name, bank_account_number, bank_account_name
) VALUES (
  'BELUM DIATUR', 'BELUM DIATUR', 'BELUM DIATUR', 'BELUM DIATUR', 'BELUM DIATUR'
);

CREATE TRIGGER trg_manual_topup_destinations_updated_at
BEFORE UPDATE ON manual_topup_destinations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
