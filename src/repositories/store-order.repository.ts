import type { PoolClient } from "pg";
import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { StoreOrder, StoreOrderItem } from "@/types/store-order";

export interface CreateStoreOrderItemInput {
  store_product_id: string;
  product_name: string;
  unit_price: string | number;
  quantity: number;
  subtotal: string | number;
}

export interface CreateStoreOrderInput {
  store_id: string;
  total_amount: string | number;
  created_by: string;
  items: CreateStoreOrderItemInput[];
}

// Inserts the order and every line item together — always called from
// inside store-payment.service.ts's createStoreOrder, itself wrapped in
// withTransaction, so a partial failure (e.g. the second item's insert
// failing) never leaves an order with only some of its items.
export async function createStoreOrder(
  input: CreateStoreOrderInput,
  client: PoolClient,
): Promise<{ order: StoreOrder; items: StoreOrderItem[] }> {
  const orderResult = await client.query<StoreOrder>(
    `INSERT INTO store_orders (store_id, total_amount, created_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.store_id, input.total_amount, input.created_by],
  );
  const order = orderResult.rows[0];

  const items: StoreOrderItem[] = [];
  for (const item of input.items) {
    const itemResult = await client.query<StoreOrderItem>(
      `INSERT INTO store_order_items (order_id, store_product_id, product_name, unit_price, quantity, subtotal)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [order.id, item.store_product_id, item.product_name, item.unit_price, item.quantity, item.subtotal],
    );
    items.push(itemResult.rows[0]);
  }

  return { order, items };
}

export async function findStoreOrderById(id: string, db: Queryable = pool): Promise<StoreOrder | null> {
  const result = await db.query<StoreOrder>(`SELECT * FROM store_orders WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function listStoreOrderItems(orderId: string, db: Queryable = pool): Promise<StoreOrderItem[]> {
  const result = await db.query<StoreOrderItem>(
    `SELECT * FROM store_order_items WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId],
  );
  return result.rows;
}

// Compare-and-swap, same discipline as store.repository.ts's verifyStore:
// only a PENDING order can become PAID, and the UPDATE's WHERE clause is
// what actually enforces that.
export async function markStoreOrderPaid(orderId: string, client: PoolClient): Promise<StoreOrder | null> {
  const result = await client.query<StoreOrder>(
    `UPDATE store_orders SET status = 'PAID' WHERE id = $1 AND status = 'PENDING' RETURNING *`,
    [orderId],
  );
  return result.rows[0] ?? null;
}
