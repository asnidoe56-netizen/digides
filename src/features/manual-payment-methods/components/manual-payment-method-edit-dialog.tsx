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
import type { ManualPaymentMethod } from "@/types/manual-payment-method";
import {
  manualPaymentMethodSchema,
  type ManualPaymentMethodFormValues,
} from "../schemas/manual-payment-method.schema";
import { updateManualPaymentMethod } from "../services/manual-payment-method-api";

export interface ManualPaymentMethodEditDialogProps {
  method: ManualPaymentMethod;
  trigger: ReactNode;
}

export function ManualPaymentMethodEditDialog({ method, trigger }: ManualPaymentMethodEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ManualPaymentMethodFormValues>({
    resolver: zodResolver(manualPaymentMethodSchema),
    defaultValues: {
      displayName: method.display_name,
      accountNumber: method.account_number,
      accountName: method.account_name,
    },
  });

  async function onSubmit(values: ManualPaymentMethodFormValues) {
    setServerError(null);
    try {
      await updateManualPaymentMethod(method.id, values);
      setOpen(false);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan. Coba lagi.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      reset({
        displayName: method.display_name,
        accountNumber: method.account_number,
        accountName: method.account_name,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah {method.code}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="displayName">Nama Tampilan</Label>
            <Input id="displayName" className="h-11" {...register("displayName")} />
            {errors.displayName ? <p className="text-sm text-destructive">{errors.displayName.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="accountNumber">
              {method.code === "DANA" || method.code === "GOPAY" ? "Nomor HP" : "Nomor Rekening"}
            </Label>
            <Input id="accountNumber" className="h-11" {...register("accountNumber")} />
            {errors.accountNumber ? (
              <p className="text-sm text-destructive">{errors.accountNumber.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="accountName">Nama Pemilik</Label>
            <Input id="accountName" className="h-11" {...register("accountName")} />
            {errors.accountName ? <p className="text-sm text-destructive">{errors.accountName.message}</p> : null}
          </div>

          <DialogFooter className="flex-row gap-3 sm:justify-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-11 flex-1">
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
