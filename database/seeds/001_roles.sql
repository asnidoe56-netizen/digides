INSERT INTO roles (code, name) VALUES
  ('SUPER_ADMIN', 'Super Admin'),
  ('BUMDES_ADMIN', 'BUMDes Admin'),
  ('KONTER', 'Konter'),
  ('AFFILIATE', 'Affiliate')
ON CONFLICT (code) DO NOTHING;
