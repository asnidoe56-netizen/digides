export interface CommissionRule {
  id: string;
  level: number;
  percentage: string;
  min_transaction: string | null;
  min_payout: string;
  holding_period_days: number;
  eligible_category_id: string | null;
  max_commission: string | null;
  effective_from: Date;
  effective_until: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type CommissionLedgerStatus = "PENDING" | "AVAILABLE" | "PAID" | "CANCELLED" | "REVERSED";

// Traceability chain Transaction -> Commission -> Referral -> Beneficiary
// is the four FK columns on this row, not an inferred join.
export interface CommissionLedgerEntry {
  id: string;
  transaction_id: string;
  referral_relationship_id: string;
  beneficiary_user_id: string;
  commission_rule_id: string;
  level: number;
  amount: string;
  status: CommissionLedgerStatus;
  available_at: Date | null;
  created_at: Date;
}

export type CommissionPayoutStatus = "REQUESTED" | "PAID" | "FAILED";

export interface CommissionPayout {
  id: string;
  user_id: string;
  amount: string;
  status: CommissionPayoutStatus;
  requested_at: Date;
  paid_at: Date | null;
  reference: string | null;
}
