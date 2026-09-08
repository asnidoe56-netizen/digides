import type { PoolClient } from "pg";
import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { StoreProduct, StoreInventoryEvent } from "@/types/store-product";

export interface CreateStoreProductInput {
  store_id: string;
  name: string;
  price: string | number;
  stock: number;
}

export async function createStoreProduct(input: CreateStoreProductInput, db: Queryable = pool): Promise<StoreProduct> {
  const result = await db.query<StoreProduct>(
    `INSERT INTO store_products (store_id, name, price, stock)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.store_id, input.name, input.price, input.stock],
  );
  return result.rows[0];
}

export async function findStoreProductById(id: string, db: Queryable = pool): Promise<StoreProduct | null> {
  const result = await db.query<StoreProduct>(`SELECT * FROM store_products WHERE id = $1`, [id]);
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
}

// Attribute edits only (name/price/aktif-nonaktif, PRD §3's MVP product
// fields) — never stock, which moves exclusively through the two
// event-logged functions above and below so that store_products.stock can
// never drift from store_inventory_events. `store_id` in the WHERE clause
// is the ownership guard: a caller can only ever edit a product belonging
// to the store they were resolved to own, even if they pass someone
// else's product id.
export async function updateStoreProduct(
  id: string,
  storeId: string,
  input: UpdateStoreProductInput,
  db: Queryable = pool,
): Promise<StoreProduct | null> {
  const result = await db.query<StoreProduct>(
    `UPDATE store_products
     SET name = COALESCE($3, name),
         price = COALESCE($4, price),
         is_active = COALESCE($5, is_active)
     WHERE id = $1 AND store_id = $2
     RETURNING *`,
    [id, storeId, input.name ?? null, input.price ?? null, input.is_active ?? null],
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
