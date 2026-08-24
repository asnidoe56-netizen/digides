-- Commission ledger keeps Transaction -> Commission -> Referral ->
-- Beneficiary fully traceable via explicit columns (not inferred joins).
-- commission_rule_id is kept even after a rule changes, so historical rows
-- always reflect the rule that actually applied at the time.

CREATE TABLE commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level smallint NOT NULL CHECK (level >= 1),
  percentage numeric(5, 2) NOT NULL CHECK (percentage >= 0),
  min_transaction numeric(14, 0) CHECK (min_transaction >= 0),
  min_payout numeric(14, 0) NOT NULL DEFAULT 0 CHECK (min_payout >= 0),
  holding_period_days integer NOT NULL DEFAULT 0 CHECK (holding_period_days >= 0),
  eligible_category_id uuid REFERENCES categories(id),
  max_commission numeric(14, 0) CHECK (max_commission >= 0),
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_commission_rules_updated_at
BEFORE UPDATE ON commission_rules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE commission_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id),
  referral_relationship_id uuid NOT NULL REFERENCES referral_relationships(id),
  beneficiary_user_id uuid NOT NULL REFERENCES users(id),
  commission_rule_id uuid NOT NULL REFERENCES commission_rules(id),
  level smallint NOT NULL,
  amount numeric(14, 0) NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'AVAILABLE', 'PAID', 'CANCELLED', 'REVERSED')),
  available_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE commission_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  amount numeric(14, 0) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'PAID', 'FAILED')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  reference text
);
