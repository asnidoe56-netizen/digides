import { apiFetch } from "@/lib/api/client";
import type { CommissionRuleFormValues } from "../schemas/commission-rule.schema";

export function saveCommissionRuleForCategory(values: CommissionRuleFormValues) {
  return apiFetch("/api/commissions/rules", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function setCommissionRuleStatus(ruleId: string, isActive: boolean) {
  return apiFetch(`/api/commissions/rules/${ruleId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export function settlePendingCommissions() {
  return apiFetch<{ settledCount: number }>("/api/commissions/settle", { method: "POST" });
}

export function payCommission(beneficiaryUserId: string) {
  return apiFetch("/api/commissions/payouts", {
    method: "POST",
    body: JSON.stringify({ beneficiaryUserId }),
  });
}

export interface CommissionSettingsPayload {
  id: string;
  auto_payout_enabled: boolean;
  payout_day_of_month: number;
  last_auto_run_month: string | null;
}

export function setCommissionAutoPayout(autoPayoutEnabled: boolean, payoutDayOfMonth: number) {
  return apiFetch<{ settings: CommissionSettingsPayload }>("/api/commissions/settings", {
    method: "PATCH",
    body: JSON.stringify({ autoPayoutEnabled, payoutDayOfMonth }),
  });
}

export interface MonthlyPayoutSummaryPayload {
  settledCount: number;
  paidBeneficiaryCount: number;
  totalPaidAmount: number;
  errors: number;
}

export function runMonthlyCommissionPayout() {
  return apiFetch<MonthlyPayoutSummaryPayload>("/api/commissions/payout/monthly", { method: "POST" });
}
