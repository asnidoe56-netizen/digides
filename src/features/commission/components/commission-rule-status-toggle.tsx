"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { CommissionRule } from "@/types/commission";
import { setCommissionRuleStatus } from "../services/commission-api";

export function CommissionRuleStatusToggle({ rule }: { rule: CommissionRule }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await setCommissionRuleStatus(rule.id, !rule.is_active);
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
        {rule.is_active ? "Nonaktifkan" : "Aktifkan"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={rule.is_active ? "Nonaktifkan Aturan Komisi?" : "Aktifkan Aturan Komisi?"}
        description={
          rule.is_active
            ? `Level ${rule.level} (${rule.percentage}%) tidak akan lagi dipakai untuk transaksi baru.`
            : `Level ${rule.level} (${rule.percentage}%) akan kembali dipakai untuk transaksi baru.`
        }
        confirmLabel={rule.is_active ? "Nonaktifkan" : "Aktifkan"}
        onConfirm={handleConfirm}
        isConfirming={isConfirming}
        variant={rule.is_active ? "destructive" : "default"}
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </>
  );
}
