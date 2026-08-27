"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { Product } from "@/types/product";
import { setProductAvailability } from "../services/products-api";

export interface ProductAvailabilityToggleProps {
  product: Product;
}

// Super Admin's own on/off switch — independent of the "Status" badge
// (Aktif/Gangguan/Nonaktif), which Digiflazz's catalog sync owns and can
// overwrite on the next sync. This one can't be reset by a sync: it's the
// answer to "matikan produk ini tanpa perlu ke Digiflazz."
export function ProductAvailabilityToggle({ product }: ProductAvailabilityToggleProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDisabled = product.admin_disabled;

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await setProductAvailability(product.id, !isDisabled);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah status produk.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setOpen(true)}>
        {isDisabled ? "Aktifkan" : "Nonaktifkan"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={isDisabled ? "Aktifkan Produk?" : "Nonaktifkan Produk?"}
        description={
          isDisabled
            ? `"${product.product_name}" akan bisa dibeli lagi oleh mitra.`
            : `"${product.product_name}" tidak akan bisa dibeli oleh mitra sampai Anda aktifkan kembali — terlepas dari status di Digiflazz.`
        }
        confirmLabel={isDisabled ? "Aktifkan" : "Nonaktifkan"}
        onConfirm={handleConfirm}
        isConfirming={isConfirming}
        variant={isDisabled ? "default" : "destructive"}
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </>
  );
}
