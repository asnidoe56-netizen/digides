import { apiFetch } from "@/lib/api/client";
import type { Store } from "@/types/store";

/// Super Admin verification: moves a store SUBMITTED -> ACTIVE. The server
/// enforces that transition with a compare-and-swap, so a double-click can
/// never verify twice — the second call comes back as an error naming the
/// store's current status rather than silently succeeding.
export function verifyStore(storeId: string) {
  return apiFetch<{ store: Store }>(`/api/stores/${storeId}/verify`, {
    method: "POST",
  });
}

/// Stop a store trading, or let it trade again. Suspending blocks the two
/// things that move money — creating an order and settling balance out —
/// and never touches the balance already in the store's wallet.
export function setStoreSuspension(storeId: string, suspend: boolean) {
  return apiFetch<{ store: Store }>(`/api/stores/${storeId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ suspend }),
  });
}
