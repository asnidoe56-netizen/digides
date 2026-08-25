import { apiFetch } from "@/lib/api/client";
import type { AdjustmentFormValues } from "../schemas/adjustment.schema";

export function createTopupRequest(walletId: string, amount: number) {
  return apiFetch("/api/wallet/topups", {
    method: "POST",
    body: JSON.stringify({ walletId, amount }),
  });
}

export function approveTopup(paymentId: string) {
  return apiFetch(`/api/wallet/topups/${paymentId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "APPROVE" }),
  });
}

export function rejectTopup(paymentId: string, reason: string) {
  return apiFetch(`/api/wallet/topups/${paymentId}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "REJECT", reason }),
  });
}

export function createAdjustment(walletId: string, values: AdjustmentFormValues) {
  return apiFetch(`/api/wallet/${walletId}/adjustment`, {
    method: "POST",
    body: JSON.stringify(values),
  });
}
