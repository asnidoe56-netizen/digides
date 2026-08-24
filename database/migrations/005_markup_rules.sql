-- Pricing engine: markup rules applied on top of Digiflazz base price.
--
-- `scope` (what the markup applies to) and `owner` (who set it) are both
-- polymorphic-by-nature in the PRD, but each is resolved here the same way
-- Architecture Decision #2 resolved wallet ownership: dedicated nullable
-- FK columns per possibility + an exclusive-arc CHECK, instead of an
-- untyped id column. This keeps referential integrity enforced by
-- PostgreSQL rather than by application code alone.

CREATE TABLE markup_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  scope_type text NOT NULL CHECK (scope_type IN ('GLOBAL', 'CATEGORY', 'BRAND', 'PRODUCT')),
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,

  owner_type text NOT NULL CHECK (owner_type IN ('MASTER', 'BUMDES', 'KONTER')),
  bumdes_id uuid REFERENCES bumdes(id) ON DELETE CASCADE,
  konter_id uuid REFERENCES konters(id) ON DELETE CASCADE,

  markup_type text NOT NULL CHECK (markup_type IN ('NOMINAL', 'PERCENTAGE')),
  markup_value numeric(14, 4) NOT NULL CHECK (markup_value >= 0),
  priority smallint NOT NULL DEFAULT 0,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT markup_rules_scope_exclusive_arc CHECK (
    (scope_type = 'GLOBAL' AND category_id IS NULL AND brand_id IS NULL AND product_id IS NULL) OR
    (scope_type = 'CATEGORY' AND category_id IS NOT NULL AND brand_id IS NULL AND product_id IS NULL) OR
    (scope_type = 'BRAND' AND brand_id IS NOT NULL AND category_id IS NULL AND product_id IS NULL) OR
    (scope_type = 'PRODUCT' AND product_id IS NOT NULL AND category_id IS NULL AND brand_id IS NULL)
  ),
  CONSTRAINT markup_rules_owner_exclusive_arc CHECK (
    (owner_type = 'MASTER' AND bumdes_id IS NULL AND konter_id IS NULL) OR
    (owner_type = 'BUMDES' AND bumdes_id IS NOT NULL AND konter_id IS NULL) OR
    (owner_type = 'KONTER' AND konter_id IS NOT NULL AND bumdes_id IS NULL)
  )
);

CREATE TRIGGER trg_markup_rules_updated_at
BEFORE UPDATE ON markup_rules
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
