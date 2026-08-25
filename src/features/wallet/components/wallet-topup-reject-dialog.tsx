"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { rejectTopup } from "../services/wallet-api";

export interface WalletTopupRejectDialogProps {
  paymentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Rejecting needs a reason (issue M18 implies every negative decision on a
// financial request should be explainable) — a plain ConfirmDialog has no
// input field, so this is its own small dialog rather than stretching the
// generic one to cover a case it wasn't built for.
export function WalletTopupRejectDialog({ paymentId, open, onOpenChange }: WalletTopupRejectDialogProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (reason.trim().length < 3) {
      setError("Alasan penolakan minimal 3 karakter");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await rejectTopup(paymentId, reason);
      onOpenChange(false);
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menolak top up.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tolak permintaan top up?</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-2">
            <Label htmlFor="reject-reason">Alasan</Label>
            <Input
              id="reject-reason"
              className="h-11"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: bukti transfer tidak sesuai"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </div>

        <DialogFooter className="flex-row gap-3 sm:justify-stretch">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 flex-1">
            Batal
          </Button>
          <Button type="button" variant="destructive" onClick={handleSubmit} disabled={isSubmitting} className="h-11 flex-1">
            {isSubmitting ? "Memproses..." : "Tolak"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
