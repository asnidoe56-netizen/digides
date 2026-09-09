"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { StoreStatus } from "@/types/store";
import { setStoreSuspension, verifyStore } from "../services/store-admin-api";

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

  // What this row can actually do, decided by the store's own status:
  // verify a store waiting for it, suspend one that's trading, or
  // reactivate a suspended one. Anything else (DRAFT, CLOSED) has no
  // action, so it says so instead of offering a button the server's
  // compare-and-swap would refuse.
  const action =
    status === "SUBMITTED"
      ? ("VERIFY" as const)
      : status === "ACTIVE"
        ? ("SUSPEND" as const)
        : status === "SUSPENDED"
          ? ("REACTIVATE" as const)
          : null;

  if (!action) {
    return <p className="text-xs text-muted-foreground">Tidak perlu tindakan</p>;
  }

  const config = {
    VERIFY: {
      button: "Verifikasi",
      variant: "default" as const,
      title: "Verifikasi toko ini?",
      description: `"${storeName}" milik ${ownerName} akan langsung bisa menerima pembayaran dari pelanggan dan memindahkan saldo tokonya ke saldo utamanya.`,
      confirmLabel: "Verifikasi",
      dialogVariant: "default" as const,
    },
    SUSPEND: {
      button: "Tangguhkan",
      variant: "outline" as const,
      title: "Tangguhkan toko ini?",
      description: `"${storeName}" tidak akan bisa menerima pembayaran baru maupun memindahkan saldonya. Saldo yang sudah ada di dompet tokonya tidak disentuh, dan pemiliknya tetap bisa melihat riwayatnya.`,
      confirmLabel: "Tangguhkan",
      dialogVariant: "destructive" as const,
    },
    REACTIVATE: {
      button: "Aktifkan",
      variant: "outline" as const,
      title: "Aktifkan kembali toko ini?",
      description: `"${storeName}" bisa kembali menerima pembayaran dan memindahkan saldo tokonya.`,
      confirmLabel: "Aktifkan",
      dialogVariant: "default" as const,
    },
  }[action];

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    try {
      if (action === "VERIFY") {
        await verifyStore(storeId);
      } else {
        await setStoreSuspension(storeId, action === "SUSPEND");
      }
      setIsOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal mengubah status toko.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant={config.variant} className="h-9" onClick={() => setIsOpen(true)}>
        {config.button}
      </Button>

      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}

      <ConfirmDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) setIsOpen(false);
        }}
        title={config.title}
        description={config.description}
        confirmLabel={config.confirmLabel}
        onConfirm={handleConfirm}
        isConfirming={isSubmitting}
        variant={config.dialogVariant}
      />
    </>
  );
}
