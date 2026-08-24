-- Payment / top-up (Architecture Decision #4 — recommended default: a
-- single `payments` table for this phase, covering both real gateway
-- payments and admin-initiated manual top-ups via method='MANUAL'. A
-- dedicated `topups` table can be split out later via a new migration if
-- Phase 6 payment-gateway work needs it — see M02 planning doc.
--
-- created_by is set for MANUAL top-ups (admin who performed it) and left
-- NULL for gateway-initiated payments (created by a webhook, not a user).

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES wallets(id),
  amount numeric(18, 0) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('QRIS', 'VA', 'MANUAL')),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED')),
  gateway_reference text UNIQUE,
  webhook_payload jsonb,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
