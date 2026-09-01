-- Akun > Keamanan's "Batasi Perangkat" — a mitra's own, optional override
-- of security_policies.max_devices_per_user (021_security.sql), letting
-- them self-restrict how many devices/apps can be logged into their own
-- account at once (e.g. down to 1 or 2 after a scam attempt), without
-- needing a Super Admin to change the platform-wide default. NULL means
-- "use the platform default" — the common case, and every existing
-- account's starting state.
ALTER TABLE users ADD COLUMN max_active_devices integer
  CHECK (max_active_devices IS NULL OR (max_active_devices >= 1 AND max_active_devices <= 5));
