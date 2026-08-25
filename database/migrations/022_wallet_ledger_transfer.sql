-- Menu Transfer: a BUMDes/Konter sending balance directly to one of their
-- own downlines. Two new ledger types instead of overloading DEBIT/TOPUP
-- (which already mean "spent on a purchase" / "topped up via payment") —
-- a transfer is neither, and reporting needs to tell the three apart.
ALTER TABLE wallet_ledger DROP CONSTRAINT wallet_ledger_type_check;
ALTER TABLE wallet_ledger ADD CONSTRAINT wallet_ledger_type_check
  CHECK (type IN ('TOPUP', 'DEBIT', 'RESERVE', 'RELEASE', 'REFUND', 'COMMISSION', 'PAYOUT', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN'));
