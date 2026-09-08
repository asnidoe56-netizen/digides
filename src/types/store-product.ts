export interface StoreProduct {
  id: string;
  store_id: string;
  name: string;
  price: string;
  stock: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
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
