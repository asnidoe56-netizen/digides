import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { StoreProductCategory } from "@/types/store-product";

// The shared fixed list seeded in 052_store_product_category.sql. There is
// no create/update/delete here on purpose (PRD Kasir Pintar §6.2): the list
// belongs to the platform, not to any one warung, and letting stores add
// their own would immediately produce "Rokok", "rokok" and "ROKOK /
// TEMBAKAU" in three warungs, ending cross-warung reporting for good.
// Changing the list is a migration, which is the right amount of friction
// for a decision that affects every store at once.
//
// Ordered by sort_order, not by name: the cashier's tabs are ordered by
// how often a warung reaches for them, and "Rokok" sitting first is worth
// real seconds per transaction.
export async function listStoreProductCategories(
  options: { onlyActive?: boolean } = {},
  db: Queryable = pool,
): Promise<StoreProductCategory[]> {
  const activeFilter = options.onlyActive ? `WHERE status = 'ACTIVE'` : "";
  const result = await db.query<StoreProductCategory>(
    `SELECT * FROM store_product_categories ${activeFilter} ORDER BY sort_order ASC, name ASC`,
  );
  return result.rows;
}

export async function findStoreProductCategoryById(
  id: string,
  db: Queryable = pool,
): Promise<StoreProductCategory | null> {
  const result = await db.query<StoreProductCategory>(
    `SELECT * FROM store_product_categories WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}
