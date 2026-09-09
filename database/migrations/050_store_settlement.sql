-- PRD Digides Toko: moving a store's balance into its owner's own main
-- wallet, which is now the only way store money funds a PPOB purchase.
--
-- Deliberately NOT reusing TRANSFER_OUT/TRANSFER_IN. That pair means "a
-- mitra sent balance to one of their downlines" — a movement between two
-- different people — and §6 rule 9 forbids a store wallet from ever being
-- its source. This is a different act: one person moving their own money
-- between two wallets they both own. Giving it its own type keeps that
-- distinction legible in the ledger, in Laporan, and to anyone auditing
-- later, instead of hiding an internal settlement inside the same bucket
-- as peer transfers.
--
-- Why the move exists at all: the store's ledger should read as a shop's
-- ledger. Funding purchases straight from the store wallet filled it with
-- RESERVE/DEBIT/RELEASE rows, failed attempts and backup-SKU noise, which
-- would make the books unreadable once the cashier grows refunds, shifts
-- and supplier purchases. It also turns the PRD's own sentence — "jualan
-- sembako Anda otomatis jadi modal jualan pulsa" — into a real ledger row
-- rather than a metaphor.
ALTER TABLE wallet_ledger DROP CONSTRAINT wallet_ledger_type_check;
ALTER TABLE wallet_ledger ADD CONSTRAINT wallet_ledger_type_check
  CHECK (type IN (
    'TOPUP', 'DEBIT', 'RESERVE', 'RELEASE', 'REFUND', 'COMMISSION', 'PAYOUT',
    'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'SALE_OUT', 'SALE_IN',
    'STORE_SETTLEMENT_OUT', 'STORE_SETTLEMENT_IN'
  ));

-- One row per move, the same shape wallet_transfers has for Menu Transfer:
-- claimed before either ledger leg is posted, so a retried request with the
-- same key returns the original result instead of moving money twice.
CREATE TABLE store_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  store_id uuid NOT NULL REFERENCES stores(id),
  store_wallet_id uuid NOT NULL REFERENCES wallets(id),
  destination_wallet_id uuid NOT NULL REFERENCES wallets(id),
  amount numeric(18, 0) NOT NULL CHECK (amount > 0),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_settlements_store_id_idx ON store_settlements (store_id);

CREATE TRIGGER trg_store_settlements_immutable
BEFORE UPDATE OR DELETE ON store_settlements
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Nullable and independent of transaction_id/transfer_id — lets both legs
-- of one settlement be traced straight back to it, the same way
-- transfer_id already does for Menu Transfer.
ALTER TABLE wallet_ledger ADD COLUMN settlement_id uuid REFERENCES store_settlements(id);
