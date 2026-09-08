"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { StoreStatus } from "@/types/store";
import { verifyStore } from "../services/store-admin-api";

export interface StoreVerifyActionProps {
  storeId: string;
  storeName: string;
  ownerName: string;
  status: StoreStatus;
}

// The one action this screen exists for. Only a SUBMITTED store can be
// verified — every other status shows why there is nothing to do instead
// of a button that would just fail, since the server's compare-and-swap
// would reject it anyway.
export function StoreVerifyAction({ storeId, storeName, ownerName, status }: StoreVerifyActionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "SUBMITTED") {
    return (
      <p className="text-xs text-muted-foreground">
        {status === "ACTIVE" ? "Sudah diverifikasi" : "Tidak perlu tindakan"}
      </p>
    );
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    try {
      await verifyStore(storeId);
      setIsOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal memverifikasi toko.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" className="h-9" onClick={() => setIsOpen(true)}>
        Verifikasi
      </Button>

      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}

      <ConfirmDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) setIsOpen(false);
        }}
        title="Verifikasi toko ini?"
        description={`"${storeName}" milik ${ownerName} akan langsung bisa menerima pembayaran dari pelanggan dan membelanjakan saldo tokonya di katalog Digides.`}
        confirmLabel="Verifikasi"
        onConfirm={handleConfirm}
        isConfirming={isSubmitting}
      />
    </>
  );
}
