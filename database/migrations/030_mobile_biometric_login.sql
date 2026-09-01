-- Extends the Flutter app's existing biometric_signature credentials
-- (028_mobile_biometric_credentials.sql, built for confirming a
-- transaction) to also cover biometric LOGIN — same crypto mechanism
-- (device-bound RSA key in Android Keystore, challenge-response,
-- server-side signature verification), reused for a second purpose
-- rather than a parallel system.
--
-- purpose distinguishes which credential a given row is: a TRANSACTION
-- credential authorizes one purchase within an already-authenticated
-- session; a LOGIN credential establishes the session itself, so it must
-- never be usable for the other purpose (enforced in application code by
-- always filtering on this column, e.g. login only ever accepts
-- purpose = 'LOGIN'). Existing rows default to 'TRANSACTION' — the only
-- kind that existed before this migration.
ALTER TABLE user_mobile_biometric_credentials
  ADD COLUMN purpose text NOT NULL DEFAULT 'TRANSACTION' CHECK (purpose IN ('TRANSACTION', 'LOGIN'));

-- device_id ties a credential to the specific user_devices row that was
-- already trust-checked when this credential was created (captured from
-- the registering session's own device) — this is the device binding a
-- LOGIN credential relies on: biometric login re-touches this same device
-- row instead of re-running fingerprint-based device authorization, and
-- refuses to issue a session if that device has since been blocked via
-- Akun > Perangkat. Nullable because TRANSACTION credentials never needed
-- this and existing rows predate the column; a LOGIN credential without a
-- device_id is treated as invalid by application code.
ALTER TABLE user_mobile_biometric_credentials
  ADD COLUMN device_id uuid REFERENCES user_devices(id) ON DELETE SET NULL;

CREATE INDEX user_mobile_biometric_credentials_device_idx ON user_mobile_biometric_credentials (device_id);

-- webauthn_challenges (027) already covers "REGISTRATION" (web WebAuthn)
-- and "TRANSACTION" (both web WebAuthn and this app's biometric_signature
-- flow) — LOGIN reuses the exact same table/shape, just a third purpose
-- value, for the challenge issued between Step 1 (resolve the account
-- from credentialId) and Step 2 (verify the signed challenge) of
-- biometric login.
ALTER TABLE webauthn_challenges DROP CONSTRAINT webauthn_challenges_purpose_check;
ALTER TABLE webauthn_challenges ADD CONSTRAINT webauthn_challenges_purpose_check
  CHECK (purpose IN ('REGISTRATION', 'TRANSACTION', 'LOGIN'));
