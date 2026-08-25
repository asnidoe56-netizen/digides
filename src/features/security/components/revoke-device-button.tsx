"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import { setDeviceStatus } from "../services/security-api";

export function RevokeDeviceButton({ deviceId, deviceName }: { deviceId: string; deviceName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await setDeviceStatus(deviceId, "REVOKED");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mencabut akses.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setOpen(true)}>
        Cabut Akses
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cabut Akses Perangkat?"
        description={`${deviceName} akan langsung kehilangan akses dan seluruh sesi aktifnya dicabut. Perangkat perlu disetujui admin lagi untuk login berikutnya.`}
        confirmLabel="Cabut Akses"
        onConfirm={handleConfirm}
        isConfirming={isConfirming}
        variant="destructive"
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </>
  );
}
