import type { PoolClient } from "pg";
import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { StoreOrder, StoreOrderItem } from "@/types/store-order";

export interface CreateStoreOrderItemInput {
  store_product_id: string;
  product_name: string;
  unit_price: string | number;
  /** PRD Kasir Pintar §6.5 — modal frozen at checkout, exactly as
   *  unit_price freezes the selling price one field up. Null when the
   *  product has no modal filled in, which the profit report states as
   *  such rather than counting as Rp0 cost. */
  unit_cost?: string | number | null;
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
      `INSERT INTO store_order_items (order_id, store_product_id, product_name, unit_price, unit_cost, quantity, subtotal)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        order.id,
        item.store_product_id,
        item.product_name,
        item.unit_price,
        item.unit_cost ?? null,
        item.quantity,
        item.subtotal,
      ],
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

export interface ListStoreOrdersFilter {
  status?: StoreOrder["status"];
  limit?: number;
  offset?: number;
}

// "Riwayat transaksi toko" (PRD §3's MVP list). Scoped by store_id, which
// the caller never supplies directly — store-payment.service.ts resolves it
// from the session's own store first.
export async function listStoreOrdersByStore(
  storeId: string,
  filter: ListStoreOrdersFilter = {},
  db: Queryable = pool,
): Promise<StoreOrder[]> {
  const params: unknown[] = [storeId];
  let statusFilter = "";
  if (filter.status) {
    params.push(filter.status);
    statusFilter = `AND status = $${params.length}`;
  }
  params.push(filter.limit ?? 20, filter.offset ?? 0);

  const result = await db.query<StoreOrder>(
    `SELECT * FROM store_orders
     WHERE store_id = $1 ${statusFilter}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countStoreOrdersByStore(
  storeId: string,
  filter: ListStoreOrdersFilter = {},
  db: Queryable = pool,
): Promise<number> {
  const params: unknown[] = [storeId];
  let statusFilter = "";
  if (filter.status) {
    params.push(filter.status);
    statusFilter = `AND status = $${params.length}`;
  }
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM store_orders WHERE store_id = $1 ${statusFilter}`,
    params,
  );
  return Number(result.rows[0].count);
}

// PRD Kasir Pintar §9 Tahap 4: sales AND profit per category, for one
// store over one date range.
//
// Three things this query gets right, each of which would be a quiet
// error to get wrong:
//
// 1. It reads unit_cost from store_order_items, NEVER store_products.
//    cost_price. §6.5: modal was frozen at checkout, so re-pricing a
//    product today must not move last month's profit. Joining
//    store_products here at all is only safe for the CATEGORY name; the
//    money all comes from the frozen row.
//
// 2. Only PAID orders count. A pending or expired order moved no goods
//    and earned nothing, and counting it would flatter the report.
//
// 3. Profit is NULL, not zero, when an item's modal was never filled in.
//    SUM() skips NULLs silently, which would understate cost and so
//    OVERSTATE profit — the exact wrong direction for a shopkeeper's
//    trust. So the profit sum is guarded: it returns NULL for the whole
//    group if any row in it lacks unit_cost, and `items_without_cost`
//    tells the UI how many, so the screen can say "3 barang belum ada
//    modalnya" instead of quietly printing a number that is too good.
export interface StoreCategorySalesRow {
  category_id: string | null;
  category_name: string | null;
  items_sold: string;
  revenue: string;
  /** Null when any item in this category has no unit_cost — see above. */
  profit: string | null;
  items_without_cost: string;
}

export async function sumStoreSalesByCategory(
  storeId: string,
  range: { from: Date; to: Date },
  db: Queryable = pool,
): Promise<StoreCategorySalesRow[]> {
  const result = await db.query<StoreCategorySalesRow>(
    `SELECT
       p.category_id,
       c.name AS category_name,
       SUM(i.quantity)::text AS items_sold,
       SUM(i.subtotal)::text AS revenue,
       CASE
         WHEN COUNT(*) FILTER (WHERE i.unit_cost IS NULL) > 0 THEN NULL
         ELSE SUM(i.subtotal - (i.unit_cost * i.quantity))::text
       END AS profit,
       COUNT(*) FILTER (WHERE i.unit_cost IS NULL)::text AS items_without_cost
     FROM store_order_items i
     JOIN store_orders o ON o.id = i.order_id
     JOIN store_products p ON p.id = i.store_product_id
     LEFT JOIN store_product_categories c ON c.id = p.category_id
     WHERE o.store_id = $1
       AND o.status = 'PAID'
       AND o.created_at >= $2
       AND o.created_at < $3
     GROUP BY p.category_id, c.name
     ORDER BY SUM(i.subtotal) DESC`,
    [storeId, range.from, range.to],
  );
  return result.rows;
}
