-- Wallet account abstraction (Architecture Decision #2 — System Architect,
-- resolved 2026-08-24). wallet_accounts is the account holder (BUMDes,
-- Konter, or User/Affiliate), identified through dedicated per-type FK
-- columns guarded by an exclusive-arc CHECK — never an untyped owner_id.
-- wallets then FKs to exactly one wallet_account, and wallet_ledger is the
-- append-only financial trail behind each wallet.

CREATE TABLE wallet_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type text NOT NULL CHECK (account_type IN ('BUMDES', 'KONTER', 'USER')),
  bumdes_id uuid REFERENCES bumdes(id),
  konter_id uuid REFERENCES konters(id),
  user_id uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT wallet_accounts_owner_exclusive_arc CHECK (
    (account_type = 'BUMDES' AND bumdes_id IS NOT NULL AND konter_id IS NULL AND user_id IS NULL) OR
    (account_type = 'KONTER' AND konter_id IS NOT NULL AND bumdes_id IS NULL AND user_id IS NULL) OR
    (account_type = 'USER' AND user_id IS NOT NULL AND bumdes_id IS NULL AND konter_id IS NULL)
  )
);

CREATE UNIQUE INDEX wallet_accounts_bumdes_unique_idx ON wallet_accounts (bumdes_id) WHERE bumdes_id IS NOT NULL;
CREATE UNIQUE INDEX wallet_accounts_konter_unique_idx ON wallet_accounts (konter_id) WHERE konter_id IS NOT NULL;
CREATE UNIQUE INDEX wallet_accounts_user_unique_idx ON wallet_accounts (user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER trg_wallet_accounts_updated_at
BEFORE UPDATE ON wallet_accounts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_account_id uuid NOT NULL UNIQUE REFERENCES wallet_accounts(id),
  available_balance numeric(18, 0) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  held_balance numeric(18, 0) NOT NULL DEFAULT 0 CHECK (held_balance >= 0),
  total_balance numeric(18, 0) GENERATED ALWAYS AS (available_balance + held_balance) STORED,
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- transaction_id references `transactions`, created in 007_transactions.sql
-- (that table depends on `wallets`, so the FK is added there once both
-- tables exist — see 007's trailing ALTER TABLE).
CREATE TABLE wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id),
  transaction_id uuid,
  type text NOT NULL CHECK (type IN ('TOPUP', 'DEBIT', 'RESERVE', 'RELEASE', 'REFUND', 'COMMISSION', 'PAYOUT', 'ADJUSTMENT')),
  amount numeric(18, 0) NOT NULL CHECK (amount <> 0),
  balance_before numeric(18, 0) NOT NULL,
  balance_after numeric(18, 0) NOT NULL,
  reference text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_wallet_ledger_immutable
BEFORE UPDATE OR DELETE ON wallet_ledger
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
