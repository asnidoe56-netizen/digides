"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { ReferralCodeWithDetail } from "@/repositories/referral.repository";
import { setReferralCodeHolderStatus } from "../services/referral-api";

export function ReferralCodeHolderStatusToggle({ code }: { code: ReferralCodeWithDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMitra = code.holder_status === "MITRA";
  const nextStatus = isMitra ? "USER" : "MITRA";

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await setReferralCodeHolderStatus(code.id, nextStatus);
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
        {isMitra ? "Jadikan User Biasa" : "Jadikan Mitra"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={isMitra ? "Jadikan User Biasa?" : "Jadikan Mitra?"}
        description={
          isMitra
            ? `${code.owner_name} akan menerima tarif reward "User Biasa" untuk setiap transaksi downline-nya mulai sekarang.`
            : `${code.owner_name} akan menerima tarif reward "Mitra" untuk setiap transaksi downline-nya mulai sekarang.`
        }
        confirmLabel={isMitra ? "Jadikan User Biasa" : "Jadikan Mitra"}
        onConfirm={handleConfirm}
        isConfirming={isConfirming}
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </>
  );
}
