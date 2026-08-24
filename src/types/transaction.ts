export type TransactionStatus = "PENDING" | "RESERVED" | "SUCCESS" | "FAILED" | "REFUNDED";

export interface Transaction {
  id: string;
  idempotency_key: string;
  wallet_id: string;
  product_id: string;
  customer_number: string;
  base_price: string;
  selling_price: string;
  status: TransactionStatus;
  provider: string;
  provider_reference: string | null;
  provider_transaction_id: string | null;
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
