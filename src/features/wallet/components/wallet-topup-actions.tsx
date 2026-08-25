"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import { approveTopup } from "../services/wallet-api";
import { WalletTopupRejectDialog } from "./wallet-topup-reject-dialog";

export interface WalletTopupActionsProps {
  paymentId: string;
}

export function WalletTopupActions({ paymentId }: WalletTopupActionsProps) {
  const router = useRouter();
  const [confirmingApprove, setConfirmingApprove] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setIsApproving(true);
    setError(null);
    try {
      await approveTopup(paymentId);
      setConfirmingApprove(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memverifikasi top up.");
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="h-9" onClick={() => setConfirmingApprove(true)}>
          Verifikasi
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9 text-destructive hover:text-destructive"
          onClick={() => setRejecting(true)}
        >
          Tolak
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <ConfirmDialog
        open={confirmingApprove}
        onOpenChange={setConfirmingApprove}
        title="Verifikasi top up ini?"
        description="Saldo wallet akan bertambah sesuai nominal dan tercatat di ledger. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Verifikasi"
        onConfirm={handleApprove}
        isConfirming={isApproving}
      />

      <WalletTopupRejectDialog paymentId={paymentId} open={rejecting} onOpenChange={setRejecting} />
    </div>
  );
}
