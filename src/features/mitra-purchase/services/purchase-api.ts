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
  /** The mitra's "Verifikasi Pengguna" result for this customerNumber, if
   *  they ran one — see ExecuteTransactionInput.customerName's doc comment
   *  server-side. */
  customerName?: string;
  /** Which of the caller's OWN wallets pays. Omitted means personal, which
   *  is the long-standing behaviour; "STORE" spends their own store's
   *  balance, the one thing a store wallet may do with its money (PRD
   *  Digides Toko §1, and §5c of the locked transaction-flow doc). The
   *  wallet itself is still resolved entirely server-side — this only
   *  names which one. */
  payWith?: "PERSONAL" | "STORE";
}

export interface MyStoreForPurchase {
  name: string;
  balance: string;
}

// Does this mitra have a store whose balance they may spend here? Returns
// null for the overwhelming majority who don't, and for a store that isn't
// ACTIVE yet — in both cases the purchase flow shows no source picker at
// all rather than an option that would be refused server-side.
export async function getSpendableStore(): Promise<MyStoreForPurchase | null> {
  const result = await apiFetch<{
    store: { name: string; status: string } | null;
    wallet: { available_balance: string } | null;
  }>("/api/stores/me");

  if (!result.store || result.store.status !== "ACTIVE") return null;
  return { name: result.store.name, balance: result.wallet?.available_balance ?? "0" };
}

// Calls the one executeTransaction() engine every category's purchase flow
// shares — verify PIN or biometric, reserve funds, call Digiflazz,
// capture/release based on the real result (transaction.service.ts).
export function executePurchase(input: ExecutePurchaseInput) {
  const shared = {
    productId: input.productId,
    customerNumber: input.customerNumber,
    idempotencyKey: input.idempotencyKey,
    customerName: input.customerName,
    // Sent only when it's actually "STORE": leaving the field out for a
    // personal purchase keeps the request byte-for-byte what it has always
    // been, so nothing about the default path changes.
    ...(input.payWith === "STORE" ? { payWith: "STORE" as const } : {}),
  };
  const body =
    input.auth.method === "PIN"
      ? { ...shared, pin: input.auth.pin }
      : { ...shared, biometricAssertion: input.auth.assertion };
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
