-- PRD Kasir Pintar §4 (Tahap 1): the category tabs a cashier taps for
-- everything that has no barcode — gorengan, es batu, rokok ketengan.
--
-- NAMING NOTE, deliberate deviation from the PRD's §4 table, which called
-- this `product_categories`. Migration 004 already created `categories`,
-- and that one belongs to the Digiflazz PPOB catalog (Pulsa, Token PLN,
-- Paket Data). A table named `product_categories` sitting one tab away
-- from `categories` invites exactly the confusion §3.1 exists to prevent —
-- someone will eventually join the wrong one and put a warung's cigarettes
-- in the PPOB catalog. Every other table in this domain is prefixed
-- `store_`; this one follows suit and is named
-- `store_product_categories`. The PRD's §4 table has been corrected to
-- match.
--
-- §6.2: ONE SHARED FIXED LIST, not free text per store.
--
-- Free text would have been easier to build and worse to live with: one
-- warung types "Rokok", the next "rokok", the third "ROKOK / TEMBAKAU",
-- and cross-warung reporting becomes impossible forever — the data would
-- have to be cleaned up after the fact, which never actually happens. A
-- fixed list also means the cashier's category tabs are the same in every
-- warung, so a shopkeeper who has used one Digides warung already knows
-- the next.
--
-- Not a store-scoped table: there is no store_id. The list is the
-- platform's, the same way `categories` is.
CREATE TABLE store_product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  -- The order the tabs appear in the cashier screen. Explicit rather than
  -- alphabetical, because the tabs are ordered by how often a warung
  -- reaches for them, not by spelling — "Rokok" first is worth real
  -- seconds per transaction.
  sort_order integer NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The MVP list from §3, seeded here rather than through application code
-- so a fresh database is immediately usable and every environment has the
-- same ids-by-name. 'Lainnya' sits last on purpose: it is the escape hatch
-- for anything the list doesn't cover, and it must never be the easiest
-- tab to hit, or everything ends up in it.
INSERT INTO store_product_categories (name, sort_order) VALUES
  ('Rokok', 1),
  ('Minuman', 2),
  ('Makanan Ringan', 3),
  ('Sembako', 4),
  ('Rumah Tangga', 5),
  ('Lainnya', 99);

-- Nullable, so every product that already exists stays valid with no data
-- migration and no guessing. A warung categorises its shelf gradually, in
-- the order it happens to edit products — not in one forced sitting before
-- the feature will work.
ALTER TABLE store_products ADD COLUMN category_id uuid REFERENCES store_product_categories(id);

-- The category tab query is "this store, this category, still active",
-- which is the one lookup this column exists to serve.
CREATE INDEX store_products_store_category_idx ON store_products (store_id, category_id);
