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

export interface LiveProductPrice {
  basePrice: string;
  markupValue: string;
  sellingPrice: string;
}

// Called right when the mitra taps "Lanjutkan" after picking a nominal —
// a fresh, single-SKU price check against Digiflazz (pricing.service.ts's
// getLiveProductPricing), per their own best-practice guidance, instead of
// trusting the snapshot the page loaded with.
export function getLiveProductPrice(productId: string) {
  return apiFetch<LiveProductPrice>(`/api/products/${productId}/live-price`, { method: "POST" });
}
