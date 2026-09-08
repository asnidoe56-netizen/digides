-- PRD Digides Toko §9 Tahap 3: two new wallet_ledger types for a store
-- payment's two legs (store-payment.service.ts's confirmStorePayment).
-- Deliberately NOT reusing TRANSFER_OUT/TRANSFER_IN (Menu Transfer,
-- migration 022) even though the mechanics are similar (two ledger legs
-- moving the same amount between two wallets in one DB transaction) —
-- reporting needs to tell "a mitra sent balance to a downline" apart from
-- "a buyer paid for a store purchase" (PRD §4's own note on this table).
ALTER TABLE wallet_ledger DROP CONSTRAINT wallet_ledger_type_check;
ALTER TABLE wallet_ledger ADD CONSTRAINT wallet_ledger_type_check
  CHECK (type IN ('TOPUP', 'DEBIT', 'RESERVE', 'RELEASE', 'REFUND', 'COMMISSION', 'PAYOUT', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'SALE_OUT', 'SALE_IN'));
