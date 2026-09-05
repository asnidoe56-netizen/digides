"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import {
  manualTopupDestinationSchema,
  type ManualTopupDestinationFormValues,
} from "../schemas/manual-topup-destination.schema";
import { saveManualTopupDestination } from "../services/manual-topup-api";

export interface ManualTopupDestinationFormProps {
  initialValues: ManualTopupDestinationFormValues;
}

export function ManualTopupDestinationForm({ initialValues }: ManualTopupDestinationFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ManualTopupDestinationFormValues>({
    resolver: zodResolver(manualTopupDestinationSchema),
    defaultValues: initialValues,
  });

  async function onSubmit(values: ManualTopupDestinationFormValues) {
    setServerError(null);
    setSuccessMessage(null);
    try {
      await saveManualTopupDestination(values);
      setSuccessMessage("Tujuan pembayaran top up manual berhasil disimpan.");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan. Coba lagi.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-lg flex-col gap-4" noValidate>
      {serverError ? (
        <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
          {serverError}
        </p>
      ) : null}
      {successMessage ? (
        <p className="rounded-md bg-status-success px-3 py-2 text-sm text-status-success-foreground">
          {successMessage}
        </p>
      ) : null}

      <div className="grid gap-2">
        <p className="text-sm font-semibold">DANA</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="danaNumber">Nomor DANA</Label>
        <Input id="danaNumber" className="h-11" placeholder="08xxxxxxxxxx" {...register("danaNumber")} />
        {errors.danaNumber ? <p className="text-sm text-destructive">{errors.danaNumber.message}</p> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="danaAccountName">Nama Pemilik Akun DANA</Label>
        <Input id="danaAccountName" className="h-11" {...register("danaAccountName")} />
        {errors.danaAccountName ? (
          <p className="text-sm text-destructive">{errors.danaAccountName.message}</p>
        ) : null}
      </div>

      <div className="mt-2 grid gap-2">
        <p className="text-sm font-semibold">Transfer Bank</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bankName">Nama Bank</Label>
        <Input id="bankName" className="h-11" placeholder="BCA / BRI / Mandiri" {...register("bankName")} />
        {errors.bankName ? <p className="text-sm text-destructive">{errors.bankName.message}</p> : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bankAccountNumber">Nomor Rekening</Label>
        <Input id="bankAccountNumber" className="h-11" {...register("bankAccountNumber")} />
        {errors.bankAccountNumber ? (
          <p className="text-sm text-destructive">{errors.bankAccountNumber.message}</p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="bankAccountName">Nama Pemilik Rekening</Label>
        <Input id="bankAccountName" className="h-11" {...register("bankAccountName")} />
        {errors.bankAccountName ? (
          <p className="text-sm text-destructive">{errors.bankAccountName.message}</p>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Ditampilkan ke Mitra saat mereka mengajukan Isi Saldo lewat aplikasi — pastikan nomor benar sebelum
        disimpan, karena Mitra akan mengirim uang langsung ke sini.
      </p>

      <div className="mt-2">
        <Button type="submit" disabled={isSubmitting} className="h-11 w-fit">
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
