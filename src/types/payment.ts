export type PaymentMethod = "QRIS" | "VA" | "MANUAL" | "MIDTRANS";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED";
export type ManualTopupChannel = "DANA" | "GOPAY" | "MANDIRI" | "BRI" | "BCA";

// A single table for this phase covers both real gateway payments and
// admin-initiated manual top-ups (method = 'MANUAL') — Architecture
// Decision #4 recommended default. `topups` can split out later if Phase 6
// payment-gateway work needs it.
export interface Payment {
  id: string;
  wallet_id: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  gateway_reference: string | null;
  /** Which manual channel this was requested through — set only when
   *  method = 'MANUAL', null for QRIS/VA/MIDTRANS. */
  manual_channel: ManualTopupChannel | null;
  webhook_payload: Record<string, unknown> | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}
