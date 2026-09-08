import type { PoolClient } from "pg";
import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { StoreProduct } from "@/types/store-product";

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
    `INSERT INTO store_inventory_events (store_product_id, order_id, delta, stock_after, reason)
     VALUES ($1, $2, $3, $4, 'SALE')`,
    [storeProductId, orderId, -quantity, product.stock],
  );

  return product;
}
