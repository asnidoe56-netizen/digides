-- Referral relationships are a plain forest: referred_id is UNIQUE so every
-- user gets exactly one parent, set once. That structural guarantee (plus
-- the self-referral CHECK below) is what keeps this cycle-free without a
-- recursive constraint — see M02 planning doc section 15.

CREATE TABLE referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE referral_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES users(id),
  referred_id uuid NOT NULL UNIQUE REFERENCES users(id),
  level smallint NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED')),
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT referral_relationships_no_self_referral CHECK (referrer_id <> referred_id)
);
