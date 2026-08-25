import { apiFetch } from "@/lib/api/client";

export function checkTransactionStatus(transactionId: string) {
  return apiFetch(`/api/transactions/${transactionId}/check-status`, { method: "POST" });
}
