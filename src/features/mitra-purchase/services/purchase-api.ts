import { apiFetch } from "@/lib/api/client";
import type { Transaction } from "@/types/transaction";

export interface ExecutePurchaseInput {
  productId: string;
  customerNumber: string;
  pin: string;
  idempotencyKey: string;
}

// Calls the one executeTransaction() engine every category's purchase flow
// shares — verify PIN, reserve funds, call Digiflazz, capture/release
// based on the real result (transaction.service.ts).
export function executePurchase(input: ExecutePurchaseInput) {
  return apiFetch<{ transaction: Transaction }>("/api/transactions/execute", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
