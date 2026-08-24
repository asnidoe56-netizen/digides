"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { UserStatus } from "@/types/user";
import { updateUserStatus } from "../services/users-api";

export interface UserStatusActionsProps {
  userId: string;
  userName: string;
  status: UserStatus;
  /** The currently logged-in admin can't act on their own account. */
  isSelf: boolean;
}

type PendingAction = "SUSPEND" | "ACTIVATE" | "DELETE";

interface ActionConfig {
  title: string;
  description: (name: string) => string;
  confirmLabel: string;
  nextStatus: UserStatus;
  variant: "default" | "destructive";
}

const ACTION_CONFIG: Record<PendingAction, ActionConfig> = {
  SUSPEND: {
    title: "Tangguhkan pengguna?",
    description: (name) => `${name} tidak akan bisa masuk sampai diaktifkan kembali.`,
    confirmLabel: "Tangguhkan",
    nextStatus: "SUSPENDED",
    variant: "destructive",
  },
  ACTIVATE: {
    title: "Aktifkan pengguna?",
    description: (name) => `${name} akan bisa masuk kembali ke akunnya.`,
    confirmLabel: "Aktifkan",
    nextStatus: "ACTIVE",
    variant: "default",
  },
  DELETE: {
    title: "Hapus pengguna?",
    description: (name) =>
      `${name} tidak akan bisa masuk dan tidak muncul di daftar aktif. Riwayat transaksi dan audit tetap tersimpan untuk kebutuhan pelacakan.`,
    confirmLabel: "Hapus",
    nextStatus: "DELETED",
    variant: "destructive",
  },
};

// Suspend/Activate/Delete for one user row. "Delete" is the soft delete
// users.status already supports (see app/api/users/[id]/route.ts) — the
// user's own history (transactions, audit trail) is never removed.
export function UserStatusActions({ userId, userName, status, isSelf }: UserStatusActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isSelf) {
    return <p className="text-xs text-muted-foreground">Ini akun Anda</p>;
  }

  async function handleConfirm() {
    if (!pendingAction) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await updateUserStatus(userId, ACTION_CONFIG[pendingAction].nextStatus);
      setPendingAction(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memperbarui status.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const config = pendingAction ? ACTION_CONFIG[pendingAction] : null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {status === "ACTIVE" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => setPendingAction("SUSPEND")}
          >
            Tangguhkan
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9"
            onClick={() => setPendingAction("ACTIVATE")}
          >
            Aktifkan
          </Button>
        )}

        {status !== "DELETED" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 text-destructive hover:text-destructive"
            onClick={() => setPendingAction("DELETE")}
          >
            Hapus
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}

      {config ? (
        <ConfirmDialog
          open={pendingAction !== null}
          onOpenChange={(open) => {
            if (!open) setPendingAction(null);
          }}
          title={config.title}
          description={config.description(userName)}
          confirmLabel={config.confirmLabel}
          onConfirm={handleConfirm}
          isConfirming={isSubmitting}
          variant={config.variant}
        />
      ) : null}
    </>
  );
}
