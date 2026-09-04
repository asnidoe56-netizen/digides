-- Audit trail for Pasal 39 of the Syarat & Ketentuan ("Pengguna hanya dapat
-- melanjutkan proses pendaftaran setelah memberikan persetujuan") — records
-- which version of the terms a self-registered user agreed to, and when.
-- Both null for accounts provisioned by an admin (registerMitra), which
-- never goes through the self-registration consent screen.
ALTER TABLE users ADD COLUMN terms_accepted_at timestamptz;
ALTER TABLE users ADD COLUMN terms_version text;
