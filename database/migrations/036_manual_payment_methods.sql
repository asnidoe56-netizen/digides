-- Replaces the single "one DANA account + one bank account" singleton
-- (manual_topup_destinations) with a proper list of payment methods Super
-- Admin can individually edit and enable/disable — needed to support
-- multiple banks (Mandiri/BRI/BCA) plus GoPay alongside DANA, each shown
-- to Mitra only when active.
CREATE TABLE manual_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code IN ('DANA', 'GOPAY', 'MANDIRI', 'BRI', 'BCA')),
  display_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

CREATE TRIGGER trg_manual_payment_methods_updated_at
BEFORE UPDATE ON manual_payment_methods FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO manual_payment_methods (code, display_name, account_number, account_name, is_active, sort_order) VALUES
  ('DANA', 'DANA', 'BELUM DIATUR', 'BELUM DIATUR', false, 1),
  ('GOPAY', 'GoPay', 'BELUM DIATUR', 'BELUM DIATUR', false, 2),
  ('MANDIRI', 'Mandiri', 'BELUM DIATUR', 'BELUM DIATUR', false, 3),
  ('BRI', 'BRI', 'BELUM DIATUR', 'BELUM DIATUR', false, 4),
  ('BCA', 'BCA', 'BELUM DIATUR', 'BELUM DIATUR', false, 5);

-- Carry forward whatever was already configured in the old singleton
-- (confirmed real DANA + one real bank account already in successful use
-- in production) rather than resetting it to placeholders.
UPDATE manual_payment_methods
SET account_number = d.dana_number, account_name = d.dana_account_name, is_active = true, updated_by = d.updated_by
FROM manual_topup_destinations d
WHERE manual_payment_methods.code = 'DANA' AND d.dana_number <> 'BELUM DIATUR';

UPDATE manual_payment_methods
SET account_number = d.bank_account_number, account_name = d.bank_account_name, is_active = true, updated_by = d.updated_by
FROM manual_topup_destinations d
WHERE manual_payment_methods.code = UPPER(TRIM(d.bank_name)) AND d.bank_account_number <> 'BELUM DIATUR';

-- Drop the old CHECK first (it only allowed 'DANA'/'TRANSFER_BANK', so
-- re-adding a stricter one immediately would fail ATRewriteTable's
-- validation against the still-unfixed 'TRANSFER_BANK' rows below) —
-- the column is briefly unconstrained until the new CHECK is added at the
-- very end, after the data is actually in shape for it.
ALTER TABLE payments DROP CONSTRAINT payments_manual_channel_check;

-- Existing MANUAL payments recorded before per-bank codes existed used the
-- generic 'TRANSFER_BANK' tag — repoint them at whichever bank was
-- actually configured at the time, so history stays accurate instead of
-- becoming an orphaned value the new CHECK constraint would otherwise reject.
UPDATE payments p
SET manual_channel = UPPER(TRIM(d.bank_name))
FROM manual_topup_destinations d
WHERE p.manual_channel = 'TRANSFER_BANK';

ALTER TABLE payments ADD CONSTRAINT payments_manual_channel_check
  CHECK (manual_channel IN ('DANA', 'GOPAY', 'MANDIRI', 'BRI', 'BCA'));

DROP TABLE manual_topup_destinations;
