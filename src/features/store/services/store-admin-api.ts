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
