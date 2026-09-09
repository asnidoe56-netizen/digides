export interface StoreProduct {
  id: string;
  store_id: string;
  name: string;
  price: string;
  stock: number;
  is_active: boolean;
  /** PRD Kasir Pintar §6.1 — unique per store, not globally. Null for the
   *  many warung goods that have no barcode at all (gorengan, es batu). */
  barcode: string | null;
  category_id: string | null;
  /** Modal / harga beli. PRD Kasir Pintar §6.6: the shopkeeper's own
   *  bookkeeping figure, never Digides' markup — nothing in the PPOB
   *  pricing engine may read this. Null means "not filled in", which the
   *  profit report must state as such rather than treating as Rp0. */
  cost_price: string | null;
  created_at: Date;
  updated_at: Date;
}

// The shared fixed list from 052_store_product_category.sql — the same
// categories in every warung, so cross-warung reporting stays possible and
// a shopkeeper who has used one Digides warung already knows the next.
export interface StoreProductCategory {
  id: string;
  name: string;
  sort_order: number;
  status: "ACTIVE" | "DISABLED";
  created_at: Date;
}

// Append-only trail behind store_products.stock — see 046_store_products.sql
// and 049_store_product_management.sql. `delta` is signed: negative for a
// SALE, either direction for an ADJUSTMENT (restock or shrinkage).
export interface StoreInventoryEvent {
  id: string;
  store_product_id: string;
  order_id: string | null;
  delta: number;
  stock_after: number;
  reason: "SALE" | "ADJUSTMENT";
  created_by: string | null;
  created_at: Date;
}
