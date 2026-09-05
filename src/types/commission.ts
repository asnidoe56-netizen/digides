import type { ReferralCodeHolderStatus } from "./referral";

export type CommissionType = "PERCENTAGE" | "FLAT";

export interface CommissionRule {
  id: string;
  /** Vestigial — direct-reference-only means this is always 1 now; kept so
   *  existing rows/queries that still order by it don't need a migration
   *  of their own. */
  level: number;
  /** Required when commission_type is PERCENTAGE, null for FLAT. */
  percentage: string | null;
  commission_type: CommissionType;
  /** Required when commission_type is FLAT, null for PERCENTAGE. */
  flat_amount: string | null;
  /** Which referrer holder_status this rule rewards — null applies to
   *  both USER and MITRA referrers alike. */
  applies_to_holder_status: ReferralCodeHolderStatus | null;
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

// Singleton row — whether the monthly settle+payout cycle
// (runMonthlyCommissionPayout) runs on its own or waits for an explicit
// Super Admin click on the Payout tab.
export interface CommissionSettings {
  id: string;
  auto_payout_enabled: boolean;
  payout_day_of_month: number;
  last_auto_run_month: string | null;
  updated_at: Date;
  updated_by: string | null;
}
