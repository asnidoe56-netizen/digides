-- PRD Digides Toko §9 Tahap 3: a store's own sellable products — entirely
-- separate from `products` (the Digiflazz PPOB catalog, §7's "katalog
-- produk jangan dipakai ulang" note). A warung's products are simple by
-- design (§3 MVP: name, harga jual, stok, aktif/nonaktif) — no variants,
-- no supplier, no category tree.
CREATE TABLE store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  name text NOT NULL,
  price numeric(18, 0) NOT NULL CHECK (price > 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_products_store_id_idx ON store_products (store_id);

CREATE TRIGGER trg_store_products_updated_at
BEFORE UPDATE ON store_products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Append-only trail behind `store_products.stock`, same relationship
-- wallet_ledger has to wallets.available_balance: the column is the live,
-- cached counter; this table is why it changed. `reason` only allows
-- 'SALE' today because that's the only stock movement Tahap 3 actually
-- builds (store-product.repository.ts's decrementStoreProductStock, called
-- from store-payment.service.ts's confirmStorePayment) — widen the CHECK
-- (same one-line move as wallet_ledger_type_check in migration 022/048)
-- when a real manual-adjustment feature is built, rather than reserving an
-- unused value now.
--
-- order_id references `store_orders`, created in migration 047 (that
-- table depends on `store_products` through store_order_items, so the FK
-- is added there once both tables exist — see 047's trailing ALTER
-- TABLE). Same forward-reference shape wallet_ledger.transaction_id used
-- between migrations 006 and 007.
CREATE TABLE store_inventory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_product_id uuid NOT NULL REFERENCES store_products(id),
  order_id uuid,
  delta integer NOT NULL CHECK (delta <> 0),
  stock_after integer NOT NULL CHECK (stock_after >= 0),
  reason text NOT NULL CHECK (reason IN ('SALE')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_inventory_events_store_product_id_idx ON store_inventory_events (store_product_id);

CREATE TRIGGER trg_store_inventory_events_immutable
BEFORE UPDATE OR DELETE ON store_inventory_events
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
