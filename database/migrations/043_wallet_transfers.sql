-- Gives Menu Transfer (wallet.service.ts's transferToDownline) the same
-- idempotency guarantee every PPOB purchase already has via
-- transactions.idempotency_key. Before this, the two wallet_ledger legs
-- (TRANSFER_OUT/TRANSFER_IN) were linked only by a free-text `reference`
-- built from `transfer-{sender}-{recipient}-{Date.now()}` — a client
-- retry (double-tap, a network timeout the client resubmits) could post
-- a second, genuinely distinct pair of ledger legs for the same transfer
-- intent. This mirrors `transactions` exactly: one row per transfer
-- intent, a UNIQUE idempotency_key, created before either ledger leg is
-- posted, so a repeat submission with the same key returns the original
-- result instead of moving money twice.
--
-- PRD Digides Toko §7 notes this as a pre-existing gap to fix separately
-- before Toko's own payment engine exists — fixed here as its own,
-- unrelated change; it does not depend on any Toko schema.
CREATE TABLE wallet_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  sender_wallet_id uuid NOT NULL REFERENCES wallets(id),
  recipient_wallet_id uuid NOT NULL REFERENCES wallets(id),
  amount numeric(18, 0) NOT NULL CHECK (amount > 0),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_wallet_transfers_immutable
BEFORE UPDATE OR DELETE ON wallet_transfers
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Nullable and independent of transaction_id (a transfer is never a
-- transactions row) — lets both ledger legs of one transfer be traced
-- back to it directly, the same way transaction_id already does for
-- purchases.
ALTER TABLE wallet_ledger ADD COLUMN transfer_id uuid REFERENCES wallet_transfers(id);
