-- Audit trail for every sensitive mutation across the platform. entity /
-- entity_id is an intentional untyped pointer (unlike wallet_accounts or
-- markup_rules) — audit_logs observes every other table generically and
-- isn't itself part of the financial integrity chain, so a physical FK
-- per entity type isn't warranted here.
--
-- Hard rule enforced at the repository layer, not the schema: pin_hash,
-- password_hash, and any credential field must be redacted from old_value/
-- new_value before this table is written to.

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id),
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
