import { apiFetch } from "@/lib/api/client";
import type { CatalogSyncSummary, PascaCatalogSyncSummary } from "@/jobs/catalog-sync";
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

// Katalog pascabayar disinkronkan lewat rute sendiri (PRD Pascabayar §7.11).
export function syncPascaCatalog(): Promise<PascaCatalogSyncSummary> {
  return apiFetch<PascaCatalogSyncSummary>("/api/catalog/sync/pasca", { method: "POST" });
}
