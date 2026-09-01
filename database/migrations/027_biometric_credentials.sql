-- Akun > Keamanan's "Biometrik untuk Transaksi" — a WebAuthn platform
-- authenticator (fingerprint/face unlock) as an alternative to typing the
-- 6-digit transaction PIN, never a replacement for the PIN itself (the PIN
-- still works even after biometric is enabled; see auth.service.ts's
-- verifyTransactionPin, unchanged). A public-key credential is bound to
-- the specific device/browser that created it — there is no portable
-- secret to steal off the server, unlike a PIN.

-- One row per (user, device/authenticator) — a mitra can enroll their
-- phone and their laptop's Windows Hello independently, each revocable on
-- its own without touching the others. "Enabled" for a user is simply
-- "has at least one row here with revoked_at IS NULL", not a separate
-- boolean flag that could drift out of sync with the credential list.
CREATE TABLE user_biometric_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key bytea NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  device_label text NOT NULL,
  transports text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX user_biometric_credentials_user_idx ON user_biometric_credentials (user_id) WHERE revoked_at IS NULL;

-- Short-lived, single-use challenges for both the enrollment (attestation)
-- and transaction-confirmation (assertion) WebAuthn ceremonies — a
-- ceremony's response is only accepted if it signs a challenge this table
-- issued, wasn't already consumed, and hasn't expired, exactly the replay
-- protection WebAuthn requires the relying party (this server) to enforce
-- itself; the browser API alone doesn't guarantee it.
CREATE TABLE webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('REGISTRATION', 'TRANSACTION')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX webauthn_challenges_user_purpose_idx ON webauthn_challenges (user_id, purpose);
