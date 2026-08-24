-- Catalog: categories, brands, products, plus their supporting/ops tables
-- (catalog sync history, Digiflazz credentials). Grouped here because all
-- four are purely catalog-adjacent, not because PRD section 8 names this
-- split explicitly — see M02 planning doc section 6.

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED'))
);

CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED'))
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  product_name text NOT NULL,
  category_id uuid REFERENCES categories(id),
  brand_id uuid REFERENCES brands(id),
  base_price numeric(14, 0) NOT NULL CHECK (base_price >= 0),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED', 'GANGGUAN')),
  provider text NOT NULL DEFAULT 'digiflazz',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE catalog_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  received_count integer NOT NULL DEFAULT 0,
  inserted_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  disabled_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  errors jsonb
);

CREATE TABLE digiflazz_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('development', 'production')),
  username text NOT NULL,
  dev_key_encrypted text,
  prod_key_encrypted text,
  base_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_digiflazz_settings_updated_at
BEFORE UPDATE ON digiflazz_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
