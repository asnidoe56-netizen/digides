import { apiFetch } from "@/lib/api/client";
import type { CatalogSyncSummary } from "@/jobs/catalog-sync";

export function syncCatalog(): Promise<CatalogSyncSummary> {
  return apiFetch<CatalogSyncSummary>("/api/catalog/sync", { method: "POST" });
}
