"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { adjustmentSchema, type AdjustmentFormValues } from "../schemas/adjustment.schema";
import { createAdjustment } from "../services/wallet-api";

export interface WalletAdjustmentDialogProps {
  walletId: string;
}

// Issue M18 sections 13-14: adjustment always needs a reason, always
// posts a new ledger entry (ADJUSTMENT type, already supported by
// postLedgerEntry — see wallet.service.ts's createAdjustment), and always
// gets an audit log entry. Nothing here edits an existing ledger row.
export function WalletAdjustmentDialog({ walletId }: WalletAdjustmentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { amount: 0, reason: "" },
  });

  async function onSubmit(values: AdjustmentFormValues) {
    setServerError(null);
    try {
      await createAdjustment(walletId, values);
      setOpen(false);
      reset({ amount: 0, reason: "" });
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal membuat adjustment.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11">
          Adjustment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Penyesuaian Saldo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="adjustment-amount">Nominal (+ untuk menambah, - untuk mengurangi)</Label>
            <Input
              id="adjustment-amount"
              type="number"
              inputMode="numeric"
              className="h-11"
              aria-invalid={!!errors.amount}
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount ? <p className="text-sm text-destructive">{errors.amount.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="adjustment-reason">Alasan</Label>
            <Input
              id="adjustment-reason"
              className="h-11"
              aria-invalid={!!errors.reason}
              placeholder="Contoh: Koreksi transaksi DG-20260824-001"
              {...register("reason")}
            />
            {errors.reason ? <p className="text-sm text-destructive">{errors.reason.message}</p> : null}
          </div>

          <DialogFooter className="flex-row gap-3 sm:justify-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-11 flex-1">
              {isSubmitting ? "Memproses..." : "Konfirmasi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
