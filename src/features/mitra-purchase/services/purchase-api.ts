import type { AuthenticationResponseJSON } from "@simplewebauthn/browser";
import { apiFetch } from "@/lib/api/client";
import type { Transaction } from "@/types/transaction";

// Confirm with exactly one of the two — a typed PIN, or a WebAuthn
// assertion from the PIN screen's "Gunakan Biometrik" option (see
// purchase-pin-screen.tsx / category-purchase-flow.tsx's
// handleBiometricSubmit). Mirrors transaction.service.ts's TransactionAuth.
export type PurchaseAuth = { method: "PIN"; pin: string } | { method: "BIOMETRIC"; assertion: AuthenticationResponseJSON };

export interface ExecutePurchaseInput {
  productId: string;
  customerNumber: string;
  idempotencyKey: string;
  auth: PurchaseAuth;
}

// Calls the one executeTransaction() engine every category's purchase flow
// shares — verify PIN or biometric, reserve funds, call Digiflazz,
// capture/release based on the real result (transaction.service.ts).
export function executePurchase(input: ExecutePurchaseInput) {
  const body =
    input.auth.method === "PIN"
      ? {
          productId: input.productId,
          customerNumber: input.customerNumber,
          idempotencyKey: input.idempotencyKey,
          pin: input.auth.pin,
        }
      : {
          productId: input.productId,
          customerNumber: input.customerNumber,
          idempotencyKey: input.idempotencyKey,
          biometricAssertion: input.auth.assertion,
        };
  return apiFetch<{ transaction: Transaction }>("/api/transactions/execute", {
    method: "POST",
    body: JSON.stringify(body),
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

// The purchase result screen's bounded poll while a transaction is still
// PENDING (category-purchase-flow.tsx) — reads /api/transactions/[id],
// the mitra-scoped read-only counterpart to the SUPER_ADMIN-only
// check-status route. Never calls Digiflazz, never writes anything.
export function getTransaction(transactionId: string) {
  return apiFetch<{ transaction: Transaction }>(`/api/transactions/${transactionId}`);
}

export interface VerifyCustomerNameResult {
  registeredName: string;
  /** Only present for meter-based utility inquiries (PLN today) — see
   *  verification.service.ts's parseRegisteredCustomer. */
  tariffPower?: string;
}

// E-Money's "Verifikasi Pengguna" — a free Digiflazz "Cek Nama Pengguna
// <Brand>" lookup (verification.service.ts's verifyCustomerName), never a
// purchase: no PIN, no wallet reservation, doesn't touch executePurchase.
export function verifyCustomerName(productId: string, customerNumber: string) {
  return apiFetch<VerifyCustomerNameResult>(`/api/products/${productId}/verify-name`, {
    method: "POST",
    body: JSON.stringify({ customerNumber }),
  });
}
