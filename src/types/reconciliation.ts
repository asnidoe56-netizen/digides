export type ReconciliationCategory =
  | "MATCH"
  | "STATUS_MISMATCH"
  | "AMOUNT_MISMATCH"
  | "LOCAL_ONLY"
  | "PROVIDER_ONLY"
  | "NEED_REVIEW";

export interface ReconciliationRecord {
  id: string;
  transaction_id: string | null;
  provider_reference: string | null;
  local_status: string | null;
  provider_status: string | null;
  local_amount: string | null;
  provider_amount: string | null;
  category: ReconciliationCategory;
  checked_at: Date;
  resolved_at: Date | null;
  resolution_note: string | null;
}
