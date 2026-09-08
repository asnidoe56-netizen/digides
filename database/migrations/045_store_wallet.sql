-- PRD Digides Toko §9 Tahap 2: extends the exclusive-arc wallet_accounts
-- pattern (Architecture Decision #2, migration 006) with a fourth owner
-- type, 'STORE'. Same shape as BUMDES/KONTER/USER: one new nullable FK
-- column, the CHECK widened to allow it, the exclusive-arc CHECK widened
-- with a matching branch, and a partial UNIQUE index so a store can never
-- end up with two wallets.
ALTER TABLE wallet_accounts ADD COLUMN store_id uuid REFERENCES stores(id);

ALTER TABLE wallet_accounts DROP CONSTRAINT wallet_accounts_account_type_check;
ALTER TABLE wallet_accounts ADD CONSTRAINT wallet_accounts_account_type_check
  CHECK (account_type IN ('BUMDES', 'KONTER', 'USER', 'STORE'));

ALTER TABLE wallet_accounts DROP CONSTRAINT wallet_accounts_owner_exclusive_arc;
ALTER TABLE wallet_accounts ADD CONSTRAINT wallet_accounts_owner_exclusive_arc CHECK (
  (account_type = 'BUMDES' AND bumdes_id IS NOT NULL AND konter_id IS NULL AND user_id IS NULL AND store_id IS NULL) OR
  (account_type = 'KONTER' AND konter_id IS NOT NULL AND bumdes_id IS NULL AND user_id IS NULL AND store_id IS NULL) OR
  (account_type = 'USER' AND user_id IS NOT NULL AND bumdes_id IS NULL AND konter_id IS NULL AND store_id IS NULL) OR
  (account_type = 'STORE' AND store_id IS NOT NULL AND bumdes_id IS NULL AND konter_id IS NULL AND user_id IS NULL)
);

CREATE UNIQUE INDEX wallet_accounts_store_unique_idx ON wallet_accounts (store_id) WHERE store_id IS NOT NULL;

-- PRD §6 rule 9 / §4 note: a STORE wallet must never be a TRANSFER_OUT/IN
-- source or destination — enforced in application code (transferToDownline
-- only ever resolves wallets through getWalletForMitraSession, which by
-- contract never returns a STORE wallet — see wallet.service.ts), not by a
-- DB constraint, since wallet_ledger.type has no owner-type awareness to
-- check against. This comment exists so that guarantee is documented next
-- to the schema change that makes STORE wallets possible in the first
-- place, not just in application code far away from here.
