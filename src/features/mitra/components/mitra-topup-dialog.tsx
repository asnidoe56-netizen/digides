"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { sendTopupSchema, type SendTopupFormValues } from "../schemas/send-topup.schema";
import { sendTopupToMitra } from "../services/mitra-api";

export interface MitraTopupDialogProps {
  bumdesId: string;
  mitraName: string;
  trigger: ReactNode;
}

// Direct send, not a request — see wallet-topup.service.ts's
// sendTopupToMitra for why this skips the PENDING/Verifikasi step the
// Wallet menu's Top Up tab uses.
export function MitraTopupDialog({ bumdesId, mitraName, trigger }: MitraTopupDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SendTopupFormValues>({
    resolver: zodResolver(sendTopupSchema),
    defaultValues: { amount: 0 },
  });

  async function onSubmit(values: SendTopupFormValues) {
    setServerError(null);
    try {
      await sendTopupToMitra(bumdesId, values);
      setOpen(false);
      reset({ amount: 0 });
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal mengirim saldo.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kirim Saldo ke {mitraName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="topup-amount">Nominal (Rupiah)</Label>
            <Input
              id="topup-amount"
              type="number"
              inputMode="numeric"
              min={1}
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
              {isSubmitting ? "Mengirim..." : "Kirim"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
