"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import { runMonthlyCommissionPayout } from "../services/commission-api";

// The manual counterpart to the unattended monthly job — settles PENDING
// commissions whose holding period has passed, then pays out everyone's
// AVAILABLE balance in one action (see commission.service.ts's
// runMonthlyCommissionPayout). Meant for when auto-payout is off, or to
// run an extra cycle on demand.
export function CommissionMonthlyPayoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleConfirm() {
    setIsRunning(true);
    setMessage(null);
    try {
      const summary = await runMonthlyCommissionPayout();
      setOpen(false);
      setMessage(
        summary.paidBeneficiaryCount > 0
          ? `${summary.paidBeneficiaryCount} penerima dibayarkan, total Rp${summary.totalPaidAmount.toLocaleString("id-ID")}.`
          : "Tidak ada komisi yang tersedia untuk dicairkan bulan ini.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Gagal memproses pencairan bulanan.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" className="h-11 w-fit" onClick={() => setOpen(true)}>
        Proses Bulan Ini
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Proses Pencairan Bulan Ini?"
        description="Seluruh komisi yang sudah waktunya cair akan langsung dikreditkan ke wallet masing-masing penerima. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Proses Sekarang"
        onConfirm={handleConfirm}
        isConfirming={isRunning}
      />
    </div>
  );
}
