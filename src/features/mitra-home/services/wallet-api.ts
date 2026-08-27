import { apiFetch } from "@/lib/api/client";

export interface MyWalletBalance {
  availableBalance: string;
  heldBalance: string;
}

// Called by WalletSummaryCard's refresh button — a live re-read of the
// caller's own wallet, resolved server-side (see GET /api/wallet/me), not
// a client-side recomputation of anything.
export function getMyWalletBalance(): Promise<MyWalletBalance> {
  return apiFetch<MyWalletBalance>("/api/wallet/me");
}
