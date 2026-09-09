import { findStoreByOwnerUserId } from "@/repositories/store.repository";
import { sumStoreSalesByCategory } from "@/repositories/store-order.repository";

// PRD Kasir Pintar §9 Tahap 4 — "pemilik warung bisa membaca untungnya
// hari itu, bukan cuma omzetnya".
//
// §6.6 boundary, restated at the layer that shapes the numbers for the
// screen: everything here is the SHOPKEEPER'S own bookkeeping. It reads
// store_order_items and store_products only. Nothing in this file may
// ever be called from the PPOB transaction or catalog services, and
// nothing here may read markup_rules.

export interface StoreCategorySales {
  categoryId: string | null;
  /** Null for products the owner never categorised — shown as "Tanpa
   *  kategori" rather than hidden, because those sales are real money. */
  categoryName: string | null;
  itemsSold: number;
  revenue: number;
  /** Null when any item in this category was sold without a modal
   *  recorded. See itemsWithoutCost. */
  profit: number | null;
  itemsWithoutCost: number;
}

export interface StoreSalesReport {
  from: Date;
  to: Date;
  categories: StoreCategorySales[];
  totalRevenue: number;
  /** Null when ANY sold item in the period lacks modal — see the note on
   *  the total below. */
  totalProfit: number | null;
  totalItemsSold: number;
  totalItemsWithoutCost: number;
}

// A whole day in the server's own timezone, which is the timezone the
// warung lives in. "Hari ini" for a shopkeeper means the day they are
// standing in, not a UTC window that cuts their evening in half.
export function dayRange(day: Date): { from: Date; to: Date } {
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  return { from, to };
}

export async function getMyStoreSalesReport(
  ownerUserId: string,
  range?: { from?: Date; to?: Date },
): Promise<StoreSalesReport> {
  const store = await findStoreByOwnerUserId(ownerUserId);
  if (!store) {
    throw new Error("Anda belum memiliki toko terdaftar");
  }

  const today = dayRange(new Date());
  const from = range?.from ?? today.from;
  const to = range?.to ?? today.to;
  if (to <= from) {
    throw new Error("Rentang tanggal tidak valid");
  }

  const rows = await sumStoreSalesByCategory(store.id, { from, to });

  const categories: StoreCategorySales[] = rows.map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    itemsSold: Number(row.items_sold),
    revenue: Number(row.revenue),
    profit: row.profit === null ? null : Number(row.profit),
    itemsWithoutCost: Number(row.items_without_cost),
  }));

  const totalItemsWithoutCost = categories.reduce((sum, c) => sum + c.itemsWithoutCost, 0);

  return {
    from,
    to,
    categories,
    totalRevenue: categories.reduce((sum, c) => sum + c.revenue, 0),
    // Deliberately null — not a partial sum — the moment ANY sold item
    // lacks modal. A partial total looks like a complete one, and a
    // shopkeeper reading "Untung Rp84.000" has no way to know it silently
    // excluded a third of what they sold. The count travels alongside so
    // the screen can say exactly what is missing and how to fix it.
    totalProfit:
      totalItemsWithoutCost > 0
        ? null
        : categories.reduce((sum, c) => sum + (c.profit ?? 0), 0),
    totalItemsSold: categories.reduce((sum, c) => sum + c.itemsSold, 0),
    totalItemsWithoutCost,
  };
}
