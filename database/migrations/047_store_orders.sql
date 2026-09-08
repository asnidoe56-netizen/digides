-- PRD Digides Toko §9 Tahap 3, §5's payment flow: an order is the
-- kasir-built cart (§5 step 1) — created with its items and their prices
-- *copied at that moment*, so a later price change on store_products never
-- rewrites an existing order's history. total_amount is the sum of the
-- items' subtotals, computed in store-payment.service.ts's createStoreOrder
-- and stored redundantly (like transactions.selling_price) so every reader
-- of an order doesn't have to re-sum its items.
CREATE TABLE store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELLED')),
  total_amount numeric(18, 0) NOT NULL CHECK (total_amount > 0),
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_orders_store_id_idx ON store_orders (store_id);

CREATE TRIGGER trg_store_orders_updated_at
BEFORE UPDATE ON store_orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Append-only — an order's line items are a snapshot of what was agreed at
-- checkout time (name + price copied from store_products), never rewritten
-- afterwards. Same immutability discipline as transaction_events/
-- wallet_ledger.
CREATE TABLE store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES store_orders(id),
  store_product_id uuid NOT NULL REFERENCES store_products(id),
  product_name text NOT NULL,
  unit_price numeric(18, 0) NOT NULL CHECK (unit_price > 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  subtotal numeric(18, 0) NOT NULL CHECK (subtotal > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_order_items_order_id_idx ON store_order_items (order_id);

CREATE TRIGGER trg_store_order_items_immutable
BEFORE UPDATE OR DELETE ON store_order_items
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- §5/§6's payment request: the one row a buyer's QR scan resolves to.
-- amount is locked here at creation time (§6 rule 1 — a client never gets
-- to say how much is being paid); expires_at enforces the 5-minute window
-- (§6 rule 5) at the database level via store-payment.repository.ts's
-- compare-and-swap UPDATE (`WHERE status = 'MENUNGGU' AND expires_at >
-- now()`), the same discipline the PPOB transaction engine and Menu
-- Transfer already use for their own one-way status transitions — never a
-- plain UPDATE trusted to only run once. idempotency_key is generated
-- server-side at creation (§5 step 2's own wording), not client-supplied;
-- the real double-payment guard is that same compare-and-swap on `status`,
-- which by construction can only ever succeed once per row.
CREATE TABLE store_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES store_orders(id),
  idempotency_key text NOT NULL UNIQUE,
  amount numeric(18, 0) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'MENUNGGU' CHECK (status IN ('MENUNGGU', 'BERHASIL', 'GAGAL', 'KEDALUWARSA', 'DIBATALKAN')),
  expires_at timestamptz NOT NULL,
  paid_by_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_payment_requests_order_id_idx ON store_payment_requests (order_id);

CREATE TRIGGER trg_store_payment_requests_updated_at
BEFORE UPDATE ON store_payment_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Completes the forward reference left open in migration 046.
ALTER TABLE store_inventory_events
  ADD CONSTRAINT store_inventory_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES store_orders(id);
