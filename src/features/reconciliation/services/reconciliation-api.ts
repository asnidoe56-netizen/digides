import { apiFetch } from "@/lib/api/client";
import type { ReconciliationCategory } from "@/types/reconciliation";

export interface RunReconciliationResult {
  checked: number;
  byCategory: Record<ReconciliationCategory, number>;
}

export function runReconciliation(dateFrom?: string, dateTo?: string) {
  return apiFetch<RunReconciliationResult>("/api/reconciliation/run", {
    method: "POST",
    body: JSON.stringify({ dateFrom, dateTo }),
  });
}

export function resolveReconciliationRecord(id: string, note: string) {
  return apiFetch(`/api/reconciliation/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });
}
