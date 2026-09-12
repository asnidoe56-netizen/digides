"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { CatalogSyncSummary, PascaCatalogSyncSummary } from "@/jobs/catalog-sync";
import { syncCatalog, syncPascaCatalog } from "../services/products-api";

// Satu bentuk tombol, dua katalog. Prabayar dan pascabayar memanggil rute
// yang berbeda (PRD Pascabayar §7.11), tapi perilaku tombolnya sama persis —
// jadi bentuknya dibagi di sini alih-alih disalin dua kali.
function SyncButton<T extends CatalogSyncSummary>({
  label,
  labelSibuk,
  variant = "default",
  jalankan,
  ringkasan,
}: {
  label: string;
  labelSibuk: string;
  variant?: "default" | "outline";
  jalankan: () => Promise<T>;
  ringkasan: (summary: T) => string;
}) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSync() {
    setIsSyncing(true);
    setResult(null);
    try {
      const summary = await jalankan();
      setResult({ success: true, message: ringkasan(summary) });
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
      <Button onClick={handleSync} disabled={isSyncing} variant={variant} className="h-11 w-fit gap-2">
        <RefreshCw className={cn("size-4", isSyncing && "animate-spin")} />
        {isSyncing ? labelSibuk : label}
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

// Menarik price-list prabayar terbaru dari Digiflazz ke tabel produk lokal
// (src/jobs/catalog-sync.ts), lalu menyegarkan halaman.
export function SyncCatalogButton() {
  return (
    <SyncButton
      label="Sinkronkan Sekarang"
      labelSibuk="Menyinkronkan..."
      jalankan={syncCatalog}
      ringkasan={(s) =>
        `Sinkron selesai: ${s.received} produk diterima, ${s.inserted} baru, ${s.updated} diperbarui${s.errors > 0 ? `, ${s.errors} gagal` : ""}.`
      }
    />
  );
}

// Katalog pascabayar: tanpa harga, hanya biaya admin dan komisi. Produk yang
// hilang dari daftar ikut dinonaktifkan, jadi jumlahnya disebut terpisah.
export function SyncPascaCatalogButton() {
  return (
    <SyncButton<PascaCatalogSyncSummary>
      label="Sinkronkan Pascabayar"
      labelSibuk="Menyinkronkan..."
      variant="outline"
      jalankan={syncPascaCatalog}
      ringkasan={(s) =>
        `Sinkron pascabayar selesai: ${s.received} produk diterima, ${s.inserted} baru, ${s.updated} diperbarui${s.missing > 0 ? `, ${s.missing} hilang dari daftar dan dinonaktifkan` : ""}${s.errors > 0 ? `, ${s.errors} gagal` : ""}.`
      }
    />
  );
}
