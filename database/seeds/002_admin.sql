-- Bootstrap Super Admin account. Uses bcrypt (via pgcrypto's crypt()) since
-- this is plain SQL with no access to the app's Argon2id hashing — PRD
-- section 6/31 allows Argon2id "atau bcrypt" for password hashing, so the
-- application's auth service must be able to verify both hash formats.
--
-- CHANGE THIS PASSWORD IMMEDIATELY after first login. Default: ChangeMe123!

INSERT INTO users (email, password_hash, full_name, status)
VALUES (
  'admin@digides.local',
  crypt('ChangeMe123!', gen_salt('bf', 10)),
  'Super Admin',
  'ACTIVE'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.email = 'admin@digides.local' AND r.code = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;
