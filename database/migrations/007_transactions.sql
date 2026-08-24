-- PPOB transaction engine: lifecycle PENDING -> RESERVED -> (SUCCESS |
-- FAILED) -> [REFUNDED]. idempotency_key is unique globally so a retried
-- or double-clicked request can never create a second financial transaction.

CREATE TABLE transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  wallet_id uuid NOT NULL REFERENCES wallets(id),
  product_id uuid NOT NULL REFERENCES products(id),
  customer_number text NOT NULL,
  base_price numeric(14, 0) NOT NULL CHECK (base_price >= 0),
  selling_price numeric(14, 0) NOT NULL CHECK (selling_price >= 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESERVED', 'SUCCESS', 'FAILED', 'REFUNDED')),
  provider text NOT NULL DEFAULT 'digiflazz',
  provider_reference text,
  provider_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Deferred from 006_wallets.sql: wallet_ledger.transaction_id can only be
-- FK'd once this table exists.
ALTER TABLE wallet_ledger
  ADD CONSTRAINT fk_wallet_ledger_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id);

CREATE TABLE transaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id),
  from_status text,
  to_status text NOT NULL,
  provider_raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_transaction_events_immutable
BEFORE UPDATE OR DELETE ON transaction_events
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
