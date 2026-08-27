-- Mirrors 015_markup_rules_category_unique.sql, but for per-product markup
-- overrides (Markup menu's new "Per Produk" tab) — lets the repository
-- upsert the one active PRODUCT/MASTER rule per product atomically instead
-- of a read-then-write, and stops two active rules for the same product
-- from ever coexisting.
CREATE UNIQUE INDEX markup_rules_master_product_active_uidx
  ON markup_rules (product_id)
  WHERE scope_type = 'PRODUCT' AND owner_type = 'MASTER' AND is_active = true;
