"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { resetUserPassword, unlockUserAccount, type AdminPasswordResetResponse } from "../services/users-api";

export interface UserRecoveryActionsProps {
  userId: string;
  userName: string;
  /** ISO string, or null when the account is not locked. */
  lockedUntil: string | null;
  isSelf: boolean;
}

// docs/security/PEMULIHAN_AKSES_AKUN.md §4 — the two actions that give a
// locked-out mitra their account back.
//
// They live here, on the user's own page, because that is the screen an
// admin opens when someone reports "I can't log in". Unlocking was
// already possible before this, but only by resolving a BRUTE_FORCE_LOGIN
// incident under Keamanan — a place nobody thinks to look, next to a page
// that offered only Tangguhkan and Hapus, both of which make it worse.
export function UserRecoveryActions({ userId, userName, lockedUntil, isSelf }: UserRecoveryActionsProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<"UNLOCK" | "RESET" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<AdminPasswordResetResponse | null>(null);

  if (isSelf) {
    return (
      <p className="text-xs text-muted-foreground">
        Untuk akun Anda sendiri, gunakan Akun &gt; Ganti Password.
      </p>
    );
  }

  async function run(action: "UNLOCK" | "RESET") {
    setIsSubmitting(true);
    setError(null);
    try {
      if (action === "UNLOCK") {
        await unlockUserAccount(userId);
        setConfirming(null);
        router.refresh();
      } else {
        const result = await resetUserPassword(userId);
        setConfirming(null);
        // Held in state, not refetched — this is the one and only time
        // the plaintext exists.
        setIssued(result);
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal menjalankan tindakan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLocked = lockedUntil !== null && new Date(lockedUntil) > new Date();

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {isLocked ? (
          <Button type="button" variant="outline" onClick={() => setConfirming("UNLOCK")}>
            <LockOpen className="size-4" />
            Buka Kunci
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => setConfirming("RESET")}>
          <KeyRound className="size-4" />
          Atur Ulang Password
        </Button>
      </div>

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      <ConfirmDialog
        open={confirming === "UNLOCK"}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title="Buka kunci akun ini?"
        description={`${userName} akan langsung bisa mencoba masuk lagi tanpa menunggu kuncinya habis. Passwordnya tidak berubah — kalau dia memang lupa passwordnya, dia akan terkunci lagi.`}
        confirmLabel="Buka Kunci"
        onConfirm={() => run("UNLOCK")}
        isConfirming={isSubmitting}
      />

      <ConfirmDialog
        open={confirming === "RESET"}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
        title="Atur ulang password akun ini?"
        description={`Password ${userName} akan diganti dengan password sementara yang muncul setelah ini — catat dan sampaikan langsung kepadanya. Dia wajib menggantinya sendiri saat masuk. Semua sesi aktifnya akan diputus. PIN transaksinya tidak disentuh, jadi saldonya tetap tidak bisa dibelanjakan siapa pun selain dia.`}
        confirmLabel="Atur Ulang Password"
        onConfirm={() => run("RESET")}
        isConfirming={isSubmitting}
        variant="destructive"
      />

      {issued ? <TemporaryPasswordDialog result={issued} onClose={() => setIssued(null)} /> : null}
    </>
  );
}

// Shown once, then gone. There is no endpoint that can return this
// password again — if the admin closes this before writing it down, the
// only way forward is to reset again and get a different one. That is
// deliberate: a temporary password that could be looked up later would be
// a working credential sitting in the database.
function TemporaryPasswordDialog({
  result,
  onClose,
}: {
  result: AdminPasswordResetResponse;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.temporaryPassword);
      setCopied(true);
    } catch {
      // Clipboard access can be refused (an insecure origin, a locked-down
      // browser). The password is on screen and selectable either way, so
      // this is a convenience failing, not a dead end — no error shown.
    }
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Password sementara untuk {result.userName}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Sampaikan password ini langsung kepada pemilik akun. <strong>Password ini hanya
            ditampilkan sekali</strong> dan tidak bisa dilihat lagi setelah jendela ini ditutup.
          </p>

          <div className="flex items-center gap-2 rounded-xl border bg-muted p-3">
            <code className="flex-1 select-all font-mono text-lg tracking-widest">
              {result.temporaryPassword}
            </code>
            <Button type="button" size="sm" variant="outline" onClick={copy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Tersalin" : "Salin"}
            </Button>
          </div>

          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-xs text-muted-foreground">
            <li>
              Masuk dengan email <span className="font-medium">{result.userEmail}</span> dan password
              di atas.
            </li>
            <li>Dia wajib mengganti password ini sendiri sebelum bisa memakai aplikasi.</li>
            <li>
              {result.revokedSessions > 0
                ? `${result.revokedSessions} sesi aktifnya diputus, jadi perangkat yang masih terbuka harus masuk ulang.`
                : "Tidak ada sesi aktif yang perlu diputus."}
            </li>
            <li>PIN transaksinya tidak disentuh dan tidak diketahui siapa pun selain dia.</li>
          </ul>

          <Button type="button" onClick={onClose}>
            Saya sudah mencatatnya
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
