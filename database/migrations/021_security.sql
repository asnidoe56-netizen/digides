-- Security module: Perangkat Aktif, Sesi Login, Aktivitas Login, Keamanan
-- Perangkat, Kebijakan Keamanan, Insiden Keamanan.
--
-- Replaces the single global users.session_version counter
-- (018_users_session_version.sql) with a real per-session row. A global
-- counter can only invalidate every session for a user at once — it can
-- never satisfy "cabut sesi tertentu tanpa menghapus perangkat", which
-- needs one row per login that can be revoked independently.
ALTER TABLE users DROP COLUMN session_version;
ALTER TABLE users ADD COLUMN locked_until timestamptz;

-- One row per distinct (user, browser+OS) combination seen at login,
-- fingerprinted by hashing user_id + normalized user agent — there is no
-- client-side device-id cookie yet, so two different physical machines
-- sharing an identical user agent string collapse into one row. A known
-- limitation of UA-based fingerprinting, acceptable for a first version.
CREATE TABLE user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  device_name text NOT NULL,
  platform text NOT NULL,
  browser text NOT NULL,
  user_agent text NOT NULL,
  last_ip inet,
  trust_status text NOT NULL DEFAULT 'TRUSTED' CHECK (trust_status IN ('TRUSTED', 'PENDING', 'BLOCKED', 'REVOKED')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fingerprint)
);

CREATE INDEX user_devices_user_idx ON user_devices (user_id);

-- A real, persisted session per login — what makes per-session revocation
-- (as opposed to per-user) possible. device_trust_status is re-checked
-- live off user_devices at every request, so blocking a device kicks out
-- its active sessions immediately, not just future login attempts.
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES user_devices(id) ON DELETE CASCADE,
  ip_address inet,
  user_agent text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_reason text
);

CREATE INDEX user_sessions_user_idx ON user_sessions (user_id, created_at DESC);
CREATE INDEX user_sessions_device_idx ON user_sessions (device_id);

-- Every authentication-related event, not just successful logins — its own
-- feed rather than reconstructed from audit_logs (which covers business-
-- entity mutations, not auth events). attempted_email is kept even when
-- user_id is null, since an unknown email failing login is still a signal.
CREATE TABLE login_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  attempted_email text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'NEW_DEVICE', 'SESSION_REVOKED', 'ACCOUNT_LOCKED'
  )),
  device_id uuid REFERENCES user_devices(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX login_activities_user_idx ON login_activities (user_id, created_at DESC);
CREATE INDEX login_activities_email_idx ON login_activities (attempted_email, created_at DESC);

-- Singleton settings row, same shape/reasoning as midtrans_settings/
-- digiflazz_settings — Super Admin edits one row of platform-wide
-- thresholds instead of these staying hardcoded constants in application
-- code (see MAX_FAILED_ATTEMPTS in the original src/services/auth.service.ts).
CREATE TABLE security_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_devices_per_user integer NOT NULL DEFAULT 5 CHECK (max_devices_per_user > 0),
  max_login_attempts integer NOT NULL DEFAULT 5 CHECK (max_login_attempts > 0),
  login_lockout_minutes integer NOT NULL DEFAULT 15 CHECK (login_lockout_minutes > 0),
  require_device_verification boolean NOT NULL DEFAULT false,
  session_timeout_minutes integer NOT NULL DEFAULT 1440 CHECK (session_timeout_minutes > 0),
  max_pin_attempts integer NOT NULL DEFAULT 3 CHECK (max_pin_attempts > 0),
  pin_lockout_minutes integer NOT NULL DEFAULT 15 CHECK (pin_lockout_minutes > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

INSERT INTO security_policies DEFAULT VALUES;

CREATE TRIGGER trg_security_policies_updated_at
BEFORE UPDATE ON security_policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-created by the enforcement points above (brute-force login lockout,
-- PIN lockout) so Super Admin has one queue to investigate instead of
-- piecing incidents together from login_activities by hand.
CREATE TABLE security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('BRUTE_FORCE_LOGIN', 'PIN_LOCKOUT', 'SUSPICIOUS_DEVICE')),
  severity text NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  device_id uuid REFERENCES user_devices(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED')),
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  resolution_note text
);

CREATE INDEX security_incidents_status_idx ON security_incidents (status, created_at DESC);
