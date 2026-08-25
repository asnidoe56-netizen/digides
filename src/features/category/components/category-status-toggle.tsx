"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { Category } from "@/types/product";
import { setCategoryStatus } from "../services/category-api";

// Disabling here isn't cosmetic — it blocks new purchases of any product
// in this category (transaction.service.ts's executeTransaction checks
// categories.status). Products stay visible either way; only checkout for
// them stops.
export function CategoryStatusToggle({ category }: { category: Category }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isActive = category.status === "ACTIVE";

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await setCategoryStatus(category.id, isActive ? "DISABLED" : "ACTIVE");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah status.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setOpen(true)}>
        {isActive ? "Nonaktifkan" : "Aktifkan"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={isActive ? "Nonaktifkan Kategori?" : "Aktifkan Kategori?"}
        description={
          isActive
            ? `Produk dalam kategori "${category.name}" tidak bisa lagi dibeli sampai kategori ini diaktifkan kembali.`
            : `Produk dalam kategori "${category.name}" akan bisa dibeli kembali.`
        }
        confirmLabel={isActive ? "Nonaktifkan" : "Aktifkan"}
        onConfirm={handleConfirm}
        isConfirming={isConfirming}
        variant={isActive ? "destructive" : "default"}
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </>
  );
}
