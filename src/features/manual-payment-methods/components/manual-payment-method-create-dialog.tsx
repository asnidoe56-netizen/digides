"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import {
  createManualPaymentMethodSchema,
  type CreateManualPaymentMethodFormValues,
} from "../schemas/create-manual-payment-method.schema";
import { createManualPaymentMethod } from "../services/manual-payment-method-api";

const DEFAULT_VALUES: CreateManualPaymentMethodFormValues = {
  code: "",
  displayName: "",
  accountNumber: "",
  accountName: "",
};

// Adds a bank/e-wallet beyond the pre-seeded DANA/GoPay/Mandiri/BRI/BCA —
// e.g. SeaBank, BNI, Permata. Starts inactive so Super Admin can double-
// check the account details via "Ubah" before it reaches Mitra.
export function ManualPaymentMethodCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateManualPaymentMethodFormValues>({
    resolver: zodResolver(createManualPaymentMethodSchema),
    defaultValues: DEFAULT_VALUES,
  });

  async function onSubmit(values: CreateManualPaymentMethodFormValues) {
    setServerError(null);
    try {
      await createManualPaymentMethod(values);
      setOpen(false);
      reset(DEFAULT_VALUES);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menambahkan metode.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setServerError(null);
      reset(DEFAULT_VALUES);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11 gap-2">
          <Plus className="size-4" />
          Tambah Metode
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Metode Pembayaran</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="new-code">Kode</Label>
            <Input id="new-code" className="h-11" placeholder="mis. SEABANK, BNI" {...register("code")} />
            <p className="text-xs text-muted-foreground">
              Pengenal unik metode ini, bukan yang dilihat Mitra — huruf/angka saja, tanpa spasi disarankan.
            </p>
            {errors.code ? <p className="text-sm text-destructive">{errors.code.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-display-name">Nama Tampilan</Label>
            <Input id="new-display-name" className="h-11" placeholder="mis. SeaBank" {...register("displayName")} />
            {errors.displayName ? <p className="text-sm text-destructive">{errors.displayName.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-account-number">Nomor Rekening / HP</Label>
            <Input id="new-account-number" className="h-11" {...register("accountNumber")} />
            {errors.accountNumber ? (
              <p className="text-sm text-destructive">{errors.accountNumber.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-account-name">Nama Pemilik</Label>
            <Input id="new-account-name" className="h-11" {...register("accountName")} />
            {errors.accountName ? <p className="text-sm text-destructive">{errors.accountName.message}</p> : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Metode baru dibuat dalam status Nonaktif — aktifkan setelah datanya dipastikan benar.
          </p>

          <DialogFooter className="flex-row gap-3 sm:justify-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-11 flex-1">
              {isSubmitting ? "Menyimpan..." : "Tambah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
