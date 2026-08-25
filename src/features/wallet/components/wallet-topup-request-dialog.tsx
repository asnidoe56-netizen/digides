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
import { topupRequestSchema, type TopupRequestFormValues } from "../schemas/topup.schema";
import { createTopupRequest } from "../services/wallet-api";

export interface WalletTopupRequestDialogProps {
  walletId: string;
}

// Creating a request only records intent (status PENDING) — it never
// credits the wallet by itself. A separate Verifikasi action on the Top
// Up tab is what actually posts the ledger entry (see
// wallet-topup.service.ts).
export function WalletTopupRequestDialog({ walletId }: WalletTopupRequestDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TopupRequestFormValues>({
    resolver: zodResolver(topupRequestSchema),
    defaultValues: { walletId, amount: 0 },
  });

  async function onSubmit(values: TopupRequestFormValues) {
    setServerError(null);
    try {
      await createTopupRequest(values.walletId, values.amount);
      setOpen(false);
      reset({ walletId, amount: 0 });
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal membuat permintaan top up.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="h-11">
          Top Up
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajukan Top Up</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="topup-amount">Nominal</Label>
            <Input
              id="topup-amount"
              type="number"
              inputMode="numeric"
              className="h-11"
              aria-invalid={!!errors.amount}
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount ? <p className="text-sm text-destructive">{errors.amount.message}</p> : null}
          </div>

          <DialogFooter className="flex-row gap-3 sm:justify-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-11 flex-1">
              {isSubmitting ? "Mengirim..." : "Ajukan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
