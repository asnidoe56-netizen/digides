import { apiFetch } from "@/lib/api/client";
import type { CatalogSyncSummary } from "@/jobs/catalog-sync";
import type { MerchandisingTag } from "@/types/product";

export function syncCatalog(): Promise<CatalogSyncSummary> {
  return apiFetch<CatalogSyncSummary>("/api/catalog/sync", { method: "POST" });
}

export function setProductAvailability(productId: string, disabled: boolean) {
  return apiFetch(`/api/products/${productId}/availability`, {
    method: "PATCH",
    body: JSON.stringify({ disabled }),
  });
}

export function setProductTag(productId: string, tag: MerchandisingTag | null) {
  return apiFetch(`/api/products/${productId}/tag`, {
    method: "PATCH",
    body: JSON.stringify({ tag }),
  });
}
