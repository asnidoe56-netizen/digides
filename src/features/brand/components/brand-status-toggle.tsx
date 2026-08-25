"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { Brand } from "@/types/product";
import { setBrandStatus } from "../services/brand-api";

// Disabling here isn't cosmetic — it blocks new purchases of any product
// under this brand (transaction.service.ts's executeTransaction checks
// brands.status). Products stay visible either way; only checkout for
// them stops. Mirrors CategoryStatusToggle exactly.
export function BrandStatusToggle({ brand }: { brand: Brand }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isActive = brand.status === "ACTIVE";

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await setBrandStatus(brand.id, isActive ? "DISABLED" : "ACTIVE");
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
        title={isActive ? "Nonaktifkan Brand?" : "Aktifkan Brand?"}
        description={
          isActive
            ? `Produk dengan brand "${brand.name}" tidak bisa lagi dibeli sampai brand ini diaktifkan kembali.`
            : `Produk dengan brand "${brand.name}" akan bisa dibeli kembali.`
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
