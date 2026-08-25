"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { SupportAgent } from "@/types/support";
import { setAgentStatus } from "../services/support-api";

export function AgentStatusToggle({ agent }: { agent: SupportAgent }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isActive = agent.status === "ACTIVE";

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await setAgentStatus(agent.id, isActive ? "INACTIVE" : "ACTIVE");
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
        title={isActive ? "Nonaktifkan Agen?" : "Aktifkan Agen?"}
        description={
          isActive
            ? `${agent.full_name} tidak akan muncul di pilihan penugasan tiket baru. Tiket yang sudah ditugaskan tidak berubah.`
            : `${agent.full_name} akan kembali bisa ditugaskan tiket baru.`
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
