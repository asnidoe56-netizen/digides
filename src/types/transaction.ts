export type TransactionStatus = "PENDING" | "RESERVED" | "SUCCESS" | "FAILED" | "REFUNDED";

export interface Transaction {
  id: string;
  idempotency_key: string;
  wallet_id: string;
  product_id: string;
  customer_number: string;
  /** The verified account-holder name from E-Money/Games' "Verifikasi
   *  Pengguna"/"Cek Username" step, if the mitra ran one before this
   *  purchase — null for every category without a verification step, and
   *  for a purchase where the mitra skipped it. See
   *  042_transactions_customer_name.sql. */
  customer_name: string | null;
  base_price: string;
  selling_price: string;
  status: TransactionStatus;
  provider: string;
  provider_reference: string | null;
  provider_transaction_id: string | null;
  /** The product this transaction was FIRST created against — set once,
   *  never changed. Compare against `product_id` to tell whether the
   *  automatic backup-SKU failover ever swapped this transaction (see
   *  041_transaction_backup_sku.sql). */
  original_product_id: string | null;
  /** Every product_id attempted so far, oldest first (the original, then
   *  each backup in the order it was tried) — also the exclusion list the
   *  next backup lookup uses. */
  tried_product_ids: string[];
  created_at: Date;
  updated_at: Date;
}

// Append-only status history, including the raw provider response for
// Super Admin troubleshooting.
export interface TransactionEvent {
  id: string;
  transaction_id: string;
  from_status: TransactionStatus | null;
  to_status: TransactionStatus;
  provider_raw_response: unknown | null;
  created_at: Date;
}
