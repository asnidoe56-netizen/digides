"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import { revokeAllSessionsForUser, revokeSession } from "../services/security-api";

export function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await revokeSession(sessionId);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mencabut sesi.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setOpen(true)}>
        Cabut Sesi
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cabut Sesi Ini?"
        description="Pengguna akan langsung keluar dari perangkat ini saja. Sesi lain milik pengguna ini tidak terpengaruh."
        confirmLabel="Cabut Sesi"
        onConfirm={handleConfirm}
        isConfirming={isConfirming}
        variant="destructive"
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </>
  );
}

export function RevokeAllSessionsButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setIsConfirming(true);
    setError(null);
    try {
      await revokeAllSessionsForUser(userId);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mencabut seluruh sesi.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setOpen(true)}>
        Cabut Semua Sesi
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cabut Semua Sesi Pengguna?"
        description={`${userName} akan keluar dari seluruh perangkat sekaligus, bukan hanya perangkat ini.`}
        confirmLabel="Cabut Semua"
        onConfirm={handleConfirm}
        isConfirming={isConfirming}
        variant="destructive"
      />
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </>
  );
}
