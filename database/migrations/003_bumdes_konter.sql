-- Organizational hierarchy: SUPER_ADMIN -> BUMDes -> Konter.

CREATE TABLE bumdes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  admin_user_id uuid NOT NULL REFERENCES users(id),
  address text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_bumdes_updated_at
BEFORE UPDATE ON bumdes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE konters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bumdes_id uuid NOT NULL REFERENCES bumdes(id),
  operator_user_id uuid NOT NULL REFERENCES users(id),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_konters_updated_at
BEFORE UPDATE ON konters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
