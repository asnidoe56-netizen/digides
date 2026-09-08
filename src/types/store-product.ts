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

// Append-only trail behind store_products.stock — see 046_store_products.sql.
export interface StoreInventoryEvent {
  id: string;
  store_product_id: string;
  order_id: string | null;
  delta: number;
  stock_after: number;
  reason: "SALE";
  created_at: Date;
}
