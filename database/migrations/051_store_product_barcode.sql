-- PRD Kasir Pintar §4 (Tahap 1): the barcode a cashier scans.
--
-- Nullable on purpose, and that is not a hedge — most of what a warung
-- sells has no barcode at all (gorengan, es batu, minyak curah, rokok
-- ketengan). A NOT NULL column here would have forced the owner to invent
-- a code for half their shelf just to save a product, which is exactly the
-- friction this feature exists to remove. Products without a barcode stay
-- first-class citizens; they are reached through the category tabs instead
-- (§3 MVP).
ALTER TABLE store_products ADD COLUMN barcode text;

-- §6.1: unique PER STORE, deliberately NOT global.
--
-- The tempting version of this index is UNIQUE (barcode) across the whole
-- platform, on the reasoning that one EAN-13 identifies one physical
-- product worldwide. That reasoning is correct about the world and wrong
-- about this table: `store_products` holds each warung's OWN listing of a
-- product — its own price, its own stock, its own name for it. Two warungs
-- both selling Gudang Garam Surya must both be able to list it. A global
-- unique index would mean the second warung to scan that pack is refused,
-- with an error it could never act on.
--
-- Partial (WHERE barcode IS NOT NULL) so the many products with no barcode
-- don't collide with each other — in Postgres every NULL is distinct, but
-- the partial index also keeps the index itself small, holding only the
-- rows that can actually be scanned.
CREATE UNIQUE INDEX store_products_store_barcode_unique_idx
  ON store_products (store_id, barcode)
  WHERE barcode IS NOT NULL;

-- The scan path's actual lookup is "this store, this barcode", which the
-- unique index above already serves. No second index is added here: a
-- warung's product list is small (tens, not thousands), and every query in
-- this feature is already scoped by store_id.
