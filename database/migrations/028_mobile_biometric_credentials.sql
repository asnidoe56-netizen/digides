-- The Flutter app's counterpart to migration 027's WebAuthn table. A
-- native mobile app has no browser to run the WebAuthn ceremony in, so
-- Akun > Keamanan's Flutter screen uses the `biometric_signature` package
-- instead: an RSA/EC key pair generated in Android Keystore (or iOS Secure
-- Enclave), gated so the private key can only be used after a successful
-- fingerprint/face match, and never leaves the device's secure hardware.
-- The server only ever sees the public key — structurally the same trust
-- model as WebAuthn (a device-bound credential the server can verify but
-- never possesses the private half of), just a different, simpler
-- protocol suited to a native app instead of a browser.
--
-- Transaction-time challenges reuse webauthn_challenges (027) as-is —
-- that table's shape (a random single-use string scoped to a user and a
-- purpose) is protocol-agnostic; only its name is WebAuthn-specific.
CREATE TABLE user_mobile_biometric_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Client-generated opaque id (a UUID minted on-device, same idempotencyKey
  -- generator the purchase flow already uses) that doubles as the
  -- biometric_signature keyAlias — there is no server-issued id to hand
  -- back before the device has already created its key pair locally.
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  algorithm text NOT NULL CHECK (algorithm IN ('RSA', 'ECDSA')),
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  device_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX user_mobile_biometric_credentials_user_idx ON user_mobile_biometric_credentials (user_id) WHERE revoked_at IS NULL;
