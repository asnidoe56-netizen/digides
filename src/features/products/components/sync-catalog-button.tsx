"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { syncCatalog } from "../services/products-api";

// Pulls the latest prepaid price-list from Digiflazz into the local
// products table (see src/jobs/catalog-sync.ts), then refreshes the page
// so the new/updated products show up immediately.
export function SyncCatalogButton() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSync() {
    setIsSyncing(true);
    setResult(null);
    try {
      const summary = await syncCatalog();
      setResult({
        success: true,
        message: `Sinkron selesai: ${summary.received} produk diterima, ${summary.inserted} baru, ${summary.updated} diperbarui${summary.errors > 0 ? `, ${summary.errors} gagal` : ""}.`,
      });
      router.refresh();
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof ApiError ? error.message : "Gagal sinkronisasi. Coba lagi.",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleSync} disabled={isSyncing} className="h-11 w-fit gap-2">
        <RefreshCw className={cn("size-4", isSyncing && "animate-spin")} />
        {isSyncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}
      </Button>
      {result ? (
        <p
          role="status"
          className={
            result.success
              ? "rounded-md bg-status-success px-3 py-2 text-sm text-status-success-foreground"
              : "rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground"
          }
        >
          {result.message}
        </p>
      ) : null}
    </div>
  );
}
