-- Extensions and shared utility functions used across every later migration.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid(), crypt() for seed bootstrap
CREATE EXTENSION IF NOT EXISTS citext;   -- case-insensitive email

-- Keeps `updated_at` accurate without every repository having to remember
-- to set it manually.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attached to append-only tables (wallet_ledger, transaction_events,
-- audit_logs) so history can never be edited or deleted, only inserted.
CREATE OR REPLACE FUNCTION forbid_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; % is not allowed', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;
