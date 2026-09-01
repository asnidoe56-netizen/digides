"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { ApiError } from "@/lib/api/client";
import { changePinFormSchema, type ChangePinValues } from "../schemas/change-pin.schema";
import { changeMyPin } from "../services/account-api";

export interface MitraChangePinViewProps {
  backHref: string;
}

// Reached from Akun > Ganti PIN. The current PIN is verified through the
// same verifyTransactionPin engine a real purchase's PIN goes through
// (POST /api/account/change-pin -> auth.service.ts), so this form is
// rate-limited/lockout-protected the same way a purchase's PIN entry is —
// three wrong PINs here counts against the same failed_attempts a mitra
// would also trip trying to buy something.
export function MitraChangePinView({ backHref }: MitraChangePinViewProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePinValues>({
    resolver: zodResolver(changePinFormSchema),
    defaultValues: { currentPin: "", newPin: "", confirmPin: "" },
  });

  async function onSubmit(values: ChangePinValues) {
    setServerError(null);
    setSuccessMessage(null);
    try {
      await changeMyPin(values);
      setSuccessMessage("PIN transaksi berhasil diubah.");
      reset();
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal mengubah PIN.");
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center gap-3 rounded-b-3xl bg-linear-to-br from-red-500 to-red-700 px-4 pt-4 pb-6 text-white sm:rounded-3xl">
        <Link
          href={backHref}
          aria-label="Kembali"
          className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <p className="font-semibold">Ganti PIN</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4" noValidate>
        {serverError ? (
          <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
            {serverError}
          </p>
        ) : null}
        {successMessage ? (
          <p role="status" className="rounded-md bg-status-success px-3 py-2 text-sm text-status-success-foreground">
            {successMessage}
          </p>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="change-pin-current">PIN Saat Ini</Label>
          <PasswordInput
            id="change-pin-current"
            className="h-11"
            inputMode="numeric"
            maxLength={6}
            autoComplete="off"
            aria-invalid={!!errors.currentPin}
            {...register("currentPin")}
          />
          {errors.currentPin ? <p className="text-sm text-destructive">{errors.currentPin.message}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="change-pin-new">PIN Baru</Label>
          <PasswordInput
            id="change-pin-new"
            className="h-11"
            inputMode="numeric"
            maxLength={6}
            autoComplete="off"
            aria-invalid={!!errors.newPin}
            {...register("newPin")}
          />
          {errors.newPin ? <p className="text-sm text-destructive">{errors.newPin.message}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="change-pin-confirm">Konfirmasi PIN Baru</Label>
          <PasswordInput
            id="change-pin-confirm"
            className="h-11"
            inputMode="numeric"
            maxLength={6}
            autoComplete="off"
            aria-invalid={!!errors.confirmPin}
            {...register("confirmPin")}
          />
          {errors.confirmPin ? <p className="text-sm text-destructive">{errors.confirmPin.message}</p> : null}
        </div>

        <Button type="submit" disabled={isSubmitting} className="h-11 bg-red-600 hover:bg-red-700">
          {isSubmitting ? "Menyimpan..." : "Simpan PIN Baru"}
        </Button>
      </form>
    </div>
  );
}
