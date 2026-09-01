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
import { changePasswordFormSchema, type ChangePasswordValues } from "../schemas/change-password.schema";
import { changeMyPassword } from "../services/account-api";

export interface MitraChangePasswordViewProps {
  backHref: string;
}

// Reached from Akun > Ganti Password. Every other active session for this
// account is revoked server-side on success (POST /api/account/change-password)
// — the current one stays logged in, so the success message below is the
// last thing shown before router.refresh(), not immediately followed by
// this same screen logging the mitra out.
export function MitraChangePasswordView({ backHref }: MitraChangePasswordViewProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordValues) {
    setServerError(null);
    setSuccessMessage(null);
    try {
      await changeMyPassword(values);
      setSuccessMessage("Password berhasil diubah. Sesi Anda di perangkat lain telah keluar otomatis.");
      reset();
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal mengubah password.");
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-center gap-3 rounded-b-3xl bg-gradient-to-br from-red-500 to-red-700 px-4 pt-4 pb-6 text-white sm:rounded-3xl">
        <Link
          href={backHref}
          aria-label="Kembali"
          className="flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <p className="font-semibold">Ganti Password</p>
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
          <Label htmlFor="change-password-current">Password Saat Ini</Label>
          <PasswordInput
            id="change-password-current"
            className="h-11"
            autoComplete="current-password"
            aria-invalid={!!errors.currentPassword}
            {...register("currentPassword")}
          />
          {errors.currentPassword ? (
            <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="change-password-new">Password Baru</Label>
          <PasswordInput
            id="change-password-new"
            className="h-11"
            autoComplete="new-password"
            aria-invalid={!!errors.newPassword}
            {...register("newPassword")}
          />
          {errors.newPassword ? <p className="text-sm text-destructive">{errors.newPassword.message}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="change-password-confirm">Konfirmasi Password Baru</Label>
          <PasswordInput
            id="change-password-confirm"
            className="h-11"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          ) : null}
        </div>

        <Button type="submit" disabled={isSubmitting} className="h-11 bg-red-600 hover:bg-red-700">
          {isSubmitting ? "Menyimpan..." : "Simpan Password Baru"}
        </Button>
      </form>
    </div>
  );
}
