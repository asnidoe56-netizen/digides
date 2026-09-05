"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import { setCommissionRuleStatus } from "../services/commission-api";

export interface CommissionRulePairStatusToggleProps {
  /** Every rule row (USER/MITRA/legacy-universal) that belongs to this
   *  category — toggled together as one unit, since the Aturan tab now
   *  presents them as a single per-category setting. */
  ruleIds: string[];
  categoryLabel: string;
  isActive: boolean;
}

export function CommissionRulePairStatusToggle({ ruleIds, categoryLabel, isActive }: CommissionRulePairStatusToggleProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await Promise.all(ruleIds.map((id) => setCommissionRuleStatus(id, !isActive)));
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
        title={isActive ? "Nonaktifkan Aturan Komisi?" : "Aktifkan Aturan Komisi?"}
        description={
          isActive
            ? `Aturan komisi untuk ${categoryLabel} tidak akan lagi dipakai untuk transaksi baru.`
            : `Aturan komisi untuk ${categoryLabel} akan kembali dipakai untuk transaksi baru.`
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
