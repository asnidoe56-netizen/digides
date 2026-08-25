-- Issue M18 requires every wallet_ledger entry to know which channel
-- originated it (WEB, TELEGRAM, ADMIN, SYSTEM) for reporting, audit, and
-- reconciliation — sections 11, 24, 25, 38. wallet_ledger has no rows yet
-- in any environment this migration has run against, so a NOT NULL column
-- can be added directly without a backfill step.

ALTER TABLE wallet_ledger
  ADD COLUMN channel text NOT NULL DEFAULT 'SYSTEM' CHECK (channel IN ('WEB', 'TELEGRAM', 'ADMIN', 'SYSTEM'));

ALTER TABLE wallet_ledger
  ALTER COLUMN channel DROP DEFAULT;

CREATE INDEX wallet_ledger_channel_idx ON wallet_ledger (channel);
