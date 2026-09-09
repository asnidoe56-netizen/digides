import type { PoolClient } from "pg";
import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { StoreProduct, StoreInventoryEvent } from "@/types/store-product";

export interface CreateStoreProductInput {
  store_id: string;
  name: string;
  price: string | number;
  stock: number;
  barcode?: string | null;
  category_id?: string | null;
  cost_price?: string | number | null;
}

export async function createStoreProduct(input: CreateStoreProductInput, db: Queryable = pool): Promise<StoreProduct> {
  const result = await db.query<StoreProduct>(
    `INSERT INTO store_products (store_id, name, price, stock, barcode, category_id, cost_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.store_id,
      input.name,
      input.price,
      input.stock,
      input.barcode ?? null,
      input.category_id ?? null,
      input.cost_price ?? null,
    ],
  );
  return result.rows[0];
}

export async function findStoreProductById(id: string, db: Queryable = pool): Promise<StoreProduct | null> {
  const result = await db.query<StoreProduct>(`SELECT * FROM store_products WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

// The scan path's one lookup (PRD Kasir Pintar §5): a cashier points the
// camera at a barcode and this decides whether it lands in the cart or
// offers "Tambah produk baru?". Scoped by store_id because barcodes are
// unique PER STORE (§6.1) — the same EAN-13 legitimately exists in every
// warung that sells that product, so a query without the store id would
// return someone else's shelf.
//
// Inactive products are included deliberately: scanning a product the
// owner has switched off should say "this product is inactive", not
// "unknown barcode" that tempts them into creating a duplicate.
export async function findStoreProductByBarcode(
  storeId: string,
  barcode: string,
  db: Queryable = pool,
): Promise<StoreProduct | null> {
  const result = await db.query<StoreProduct>(
    `SELECT * FROM store_products WHERE store_id = $1 AND barcode = $2`,
    [storeId, barcode],
  );
  return result.rows[0] ?? null;
}

export async function listStoreProductsByStore(
  storeId: string,
  options: { onlyActive?: boolean } = {},
  db: Queryable = pool,
): Promise<StoreProduct[]> {
  const activeFilter = options.onlyActive ? `AND is_active = true` : "";
  const result = await db.query<StoreProduct>(
    `SELECT * FROM store_products WHERE store_id = $1 ${activeFilter} ORDER BY name ASC`,
    [storeId],
  );
  return result.rows;
}

// Single atomic guarded UPDATE — `stock >= $2` in the WHERE clause is what
// actually prevents oversell (Postgres locks the row for the statement's
// duration), not a separate SELECT ... FOR UPDATE first. Returns null if
// there wasn't enough stock, letting the caller decide how to fail (in
// store-payment.service.ts's confirmStorePayment, this throws inside the
// payment's DB transaction, rolling back everything including the payment
// request's status flip — PRD §6 rule 6: a failed payment never leaves
// stock changed). MUST be called with a PoolClient from an open
// withTransaction() — never the shared pool — both because it needs to
// share the transaction that also posts the ledger legs, and because the
// paired store_inventory_events insert below must never be recorded
// without the stock change actually taking effect.
export async function decrementStoreProductStock(
  storeProductId: string,
  quantity: number,
  orderId: string,
  buyerUserId: string,
  client: PoolClient,
): Promise<StoreProduct | null> {
  const result = await client.query<StoreProduct>(
    `UPDATE store_products SET stock = stock - $2 WHERE id = $1 AND stock >= $2 RETURNING *`,
    [storeProductId, quantity],
  );
  const product = result.rows[0];
  if (!product) {
    return null;
  }

  await client.query(
    `INSERT INTO store_inventory_events (store_product_id, order_id, delta, stock_after, reason, created_by)
     VALUES ($1, $2, $3, $4, 'SALE', $5)`,
    [storeProductId, orderId, -quantity, product.stock, buyerUserId],
  );

  return product;
}

export interface UpdateStoreProductInput {
  name?: string;
  price?: string | number;
  is_active?: boolean;
  /** null clears the barcode — see the SET-builder note below. */
  barcode?: string | null;
  category_id?: string | null;
  cost_price?: string | number | null;
}

// Attribute edits only (name/price/aktif-nonaktif plus Kasir Pintar's
// barcode/kategori/modal) — never stock, which moves exclusively through
// the two event-logged functions above and below so that
// store_products.stock can never drift from store_inventory_events.
// `store_id` in the WHERE clause is the ownership guard: a caller can only
// ever edit a product belonging to the store they were resolved to own,
// even if they pass someone else's product id.
//
// Built as an explicit SET list rather than the COALESCE($n, col) pattern
// this function used before Kasir Pintar. COALESCE cannot tell "field not
// sent" from "field set to null", which was harmless while every editable
// column was NOT NULL — but barcode, category_id and cost_price are all
// nullable, and clearing them is a real thing an owner needs to do (a
// mistyped barcode, a modal they no longer stand behind). Under COALESCE
// those fields would have been write-once, with no error to explain why.
// Here `undefined` means leave alone and `null` means clear.
export async function updateStoreProduct(
  id: string,
  storeId: string,
  input: UpdateStoreProductInput,
  db: Queryable = pool,
): Promise<StoreProduct | null> {
  const assignments: string[] = [];
  const values: unknown[] = [id, storeId];

  function set(column: string, value: unknown) {
    if (value === undefined) return;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  set("name", input.name);
  set("price", input.price);
  set("is_active", input.is_active);
  set("barcode", input.barcode);
  set("category_id", input.category_id);
  set("cost_price", input.cost_price);

  // Nothing to change: return the row as it stands rather than emitting
  // `SET` with an empty list, which is a syntax error. The API layer
  // already rejects an empty payload; this keeps the repository safe to
  // call regardless.
  if (assignments.length === 0) {
    const current = await db.query<StoreProduct>(
      `SELECT * FROM store_products WHERE id = $1 AND store_id = $2`,
      [id, storeId],
    );
    return current.rows[0] ?? null;
  }

  const result = await db.query<StoreProduct>(
    `UPDATE store_products
     SET ${assignments.join(", ")}
     WHERE id = $1 AND store_id = $2
     RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

// The restock/correction counterpart of decrementStoreProductStock: one
// atomic guarded UPDATE (`stock + delta >= 0` keeps the floor at zero the
// same way the sale path does) plus its matching append-only event. Delta
// is signed — positive restocks, negative corrects shrinkage — mirroring
// wallet_ledger's ADJUSTMENT rather than splitting into two one-way
// operations. Returns null when the product isn't this store's, or when a
// negative delta would take stock below zero.
export async function adjustStoreProductStock(
  id: string,
  storeId: string,
  delta: number,
  actorUserId: string,
  client: PoolClient,
): Promise<StoreProduct | null> {
  const result = await client.query<StoreProduct>(
    `UPDATE store_products
     SET stock = stock + $3
     WHERE id = $1 AND store_id = $2 AND stock + $3 >= 0
     RETURNING *`,
    [id, storeId, delta],
  );
  const product = result.rows[0];
  if (!product) {
    return null;
  }

  await client.query(
    `INSERT INTO store_inventory_events (store_product_id, order_id, delta, stock_after, reason, created_by)
     VALUES ($1, NULL, $2, $3, 'ADJUSTMENT', $4)`,
    [id, delta, product.stock, actorUserId],
  );

  return product;
}

export async function listStoreInventoryEventsForOrder(
  orderId: string,
  db: Queryable = pool,
): Promise<StoreInventoryEvent[]> {
  const result = await db.query<StoreInventoryEvent>(
    `SELECT * FROM store_inventory_events WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId],
  );
  return result.rows;
}
