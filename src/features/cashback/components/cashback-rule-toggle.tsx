"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import { setCashbackRuleActive } from "../services/cashback-api";

// Menonaktifkan, bukan menghapus. Aturan yang sudah pernah membayar
// dirujuk oleh baris cashback_ledger; menghapusnya akan membuat riwayat
// pembayaran kehilangan jawaban atas "kenapa uang ini dibayar".
export function CashbackRuleToggle({
  id,
  label,
  isActive,
}: {
  id: string;
  label: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    try {
      await setCashbackRuleActive(id, !isActive);
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal mengubah status aturan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        {isActive ? "Nonaktifkan" : "Aktifkan"}
      </Button>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) setOpen(false);
        }}
        title={isActive ? "Nonaktifkan cashback ini?" : "Aktifkan kembali cashback ini?"}
        description={
          isActive
            ? `Cashback untuk ${label} berhenti dibayar mulai transaksi berikutnya. Cashback yang sudah terbayar tidak ditarik kembali.`
            : `Cashback untuk ${label} kembali dibayar mulai transaksi berikutnya.`
        }
        confirmLabel={isActive ? "Nonaktifkan" : "Aktifkan"}
        onConfirm={handleConfirm}
        isConfirming={isSubmitting}
        variant={isActive ? "destructive" : "default"}
      />
    </>
  );
}
