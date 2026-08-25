import { apiFetch } from "@/lib/api/client";
import type { CommissionRuleFormValues } from "../schemas/commission-rule.schema";

export function createCommissionRule(values: CommissionRuleFormValues) {
  return apiFetch("/api/commissions/rules", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function updateCommissionRule(ruleId: string, values: CommissionRuleFormValues, isActive: boolean) {
  return apiFetch(`/api/commissions/rules/${ruleId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...values, isActive }),
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
