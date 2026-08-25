-- The support team's staff directory — deliberately its own lightweight
-- table, not a `users` row with a new role. Support agents don't need a
-- DigiDes login yet (no support-facing portal exists), just a roster
-- Super Admin can assign real tickets (mitra_complaints) to and track.
CREATE TABLE support_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email citext NOT NULL UNIQUE,
  phone text,
  role text NOT NULL DEFAULT 'AGENT' CHECK (role IN ('AGENT', 'SUPERVISOR')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_support_agents_updated_at
BEFORE UPDATE ON support_agents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Lets a real ticket (a Mitra's complaint) be handed to a specific team
-- member — nullable because a new complaint starts unassigned.
ALTER TABLE mitra_complaints ADD COLUMN assigned_agent_id uuid REFERENCES support_agents(id);
CREATE INDEX mitra_complaints_assigned_agent_idx ON mitra_complaints (assigned_agent_id);
