"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { ReferralCodeWithDetail } from "@/repositories/referral.repository";
import { setReferralCodeStatus } from "../services/referral-api";

export function ReferralCodeStatusToggle({ code }: { code: ReferralCodeWithDetail }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await setReferralCodeStatus(code.id, !code.is_active);
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
        {code.is_active ? "Nonaktifkan" : "Aktifkan"}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={code.is_active ? "Nonaktifkan Kode Referral?" : "Aktifkan Kode Referral?"}
        description={
          code.is_active
            ? `Kode ${code.code} tidak bisa lagi dipakai untuk mendaftarkan mitra/pengguna baru.`
            : `Kode ${code.code} akan bisa dipakai kembali untuk mendaftarkan mitra/pengguna baru.`
        }
        confirmLabel={code.is_active ? "Nonaktifkan" : "Aktifkan"}
        onConfirm={handleConfirm}
        isConfirming={isConfirming}
        variant={code.is_active ? "destructive" : "default"}
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </>
  );
}
