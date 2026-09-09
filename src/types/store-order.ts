export type StoreOrderStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "CANCELLED";

export interface StoreOrder {
  id: string;
  store_id: string;
  status: StoreOrderStatus;
  total_amount: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// Snapshot of a product's name/price at checkout time — never rewritten,
// even if store_products.name/price changes later. See 047_store_orders.sql.
export interface StoreOrderItem {
  id: string;
  order_id: string;
  store_product_id: string;
  product_name: string;
  unit_price: string;
  /** Modal frozen at checkout — PRD Kasir Pintar §6.5. Null when the
   *  product had no modal filled in; the profit report says so rather
   *  than counting it as Rp0 cost. Margin is never stored: it is always
   *  unit_price − unit_cost. */
  unit_cost: string | null;
  quantity: number;
  subtotal: string;
  created_at: Date;
}

export type StorePaymentRequestStatus = "MENUNGGU" | "BERHASIL" | "GAGAL" | "KEDALUWARSA" | "DIBATALKAN";

// One row per QR a buyer scans — see PRD Digides Toko §5/§6.
export interface StorePaymentRequest {
  id: string;
  order_id: string;
  idempotency_key: string;
  amount: string;
  status: StorePaymentRequestStatus;
  expires_at: Date;
  paid_by_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}
