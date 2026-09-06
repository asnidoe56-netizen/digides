-- The original 5-code CHECK constraint assumed Super Admin would only
-- ever need exactly DANA/GoPay/Mandiri/BRI/BCA. In practice a Mitra asked
-- for SeaBank, and rather than a code change every time a new bank/wallet
-- comes up, this opens manual_payment_methods.code to any code Super
-- Admin adds through a new "Tambah Metode" action — UNIQUE is what
-- actually protects against duplicates, not a fixed enum. The matching
-- payments.manual_channel CHECK is relaxed the same way, since it just
-- has to match whatever code was active at request time (already
-- re-validated server-side in wallet-topup.service.ts).
ALTER TABLE manual_payment_methods DROP CONSTRAINT manual_payment_methods_code_check;
ALTER TABLE payments DROP CONSTRAINT payments_manual_channel_check;

-- Data fix: a Mitra tried adding SeaBank by editing the BRI row's display
-- fields (the only edit surface that existed before this migration),
-- which left "BRI" holding SeaBank's real account instead of its own.
-- Split them back into two independent rows: BRI resets to an
-- unconfigured placeholder (its own real account was never actually
-- entered), and the real SeaBank data moves to a genuine SEABANK row.
INSERT INTO manual_payment_methods (code, display_name, account_number, account_name, is_active, sort_order)
SELECT 'SEABANK', 'SeaBank', account_number, account_name, is_active, 6
FROM manual_payment_methods WHERE code = 'BRI';

UPDATE manual_payment_methods
SET display_name = 'BRI', account_number = 'BELUM DIATUR', account_name = 'BELUM DIATUR', is_active = false
WHERE code = 'BRI';
