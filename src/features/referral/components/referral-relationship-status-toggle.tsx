"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { ReferralRelationshipWithDetail } from "@/repositories/referral.repository";
import { setReferralRelationshipStatus } from "../services/referral-api";

export function ReferralRelationshipStatusToggle({ relationship }: { relationship: ReferralRelationshipWithDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBlocked = relationship.status === "BLOCKED";

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await setReferralRelationshipStatus(relationship.id, isBlocked ? "ACTIVE" : "BLOCKED");
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
        {isBlocked ? "Buka Blokir" : "Blokir"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={isBlocked ? "Buka Blokir Relasi Referral?" : "Blokir Relasi Referral?"}
        description={
          isBlocked
            ? `${relationship.referrer_name} akan kembali menerima komisi dari transaksi ${relationship.referred_name}.`
            : `${relationship.referrer_name} tidak akan lagi menerima komisi dari transaksi ${relationship.referred_name}. Riwayat komisi yang sudah ada tidak berubah.`
        }
        confirmLabel={isBlocked ? "Buka Blokir" : "Blokir"}
        onConfirm={handleConfirm}
        isConfirming={isConfirming}
        variant={isBlocked ? "default" : "destructive"}
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </>
  );
}
