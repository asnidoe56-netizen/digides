-- Lets a logout truly kill a session server-side, not just clear one
-- browser's cookie. The signed session cookie is otherwise fully
-- stateless (payload + HMAC, no DB-backed session table) — embedding this
-- counter in the token and checking it against the current DB value on
-- every request means logging out (which bumps this) instantly
-- invalidates every outstanding token for that user, on every device,
-- even ones already leaked/copied elsewhere.
ALTER TABLE users ADD COLUMN session_version integer NOT NULL DEFAULT 0;
