"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { ApiError } from "@/lib/api/client";
import { registerFormSchema, type RegisterFormValues } from "../schemas/register.schema";
import { registerUser } from "../services/auth-api";

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerFormSchema) });

  async function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    try {
      // confirmPassword/confirmPin only exist to validate the form
      // client-side — the server schema (registerServerSchema) never sees them.
      const { confirmPassword: _confirmPassword, confirmPin: _confirmPin, ...serverInput } = values;
      await registerUser(serverInput);
      router.push("/login?registered=1");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal mendaftar. Coba lagi.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {serverError ? (
        <p
          role="alert"
          className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground"
        >
          {serverError}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="full_name">Nama lengkap</Label>
        <Input
          id="full_name"
          autoComplete="name"
          className="h-11"
          aria-invalid={!!errors.full_name}
          {...register("full_name")}
        />
        {errors.full_name ? (
          <p className="text-sm text-destructive">{errors.full_name.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          className="h-11"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="phone">Nomor HP (opsional)</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="081234567890"
          className="h-11"
          aria-invalid={!!errors.phone}
          {...register("phone")}
        />
        {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Konfirmasi password</Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="pin">PIN transaksi (6 digit)</Label>
        <PasswordInput
          id="pin"
          inputMode="numeric"
          maxLength={6}
          autoComplete="off"
          className="h-11"
          aria-invalid={!!errors.pin}
          {...register("pin")}
        />
        <p className="text-xs text-muted-foreground">Dipakai untuk mengonfirmasi setiap transaksi.</p>
        {errors.pin ? <p className="text-sm text-destructive">{errors.pin.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmPin">Konfirmasi PIN</Label>
        <PasswordInput
          id="confirmPin"
          inputMode="numeric"
          maxLength={6}
          autoComplete="off"
          className="h-11"
          aria-invalid={!!errors.confirmPin}
          {...register("confirmPin")}
        />
        {errors.confirmPin ? <p className="text-sm text-destructive">{errors.confirmPin.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="referralCode">Kode referensi (opsional)</Label>
        <Input
          id="referralCode"
          className="h-11"
          placeholder="Kode referral dari yang mengajak Anda"
          aria-invalid={!!errors.referralCode}
          {...register("referralCode")}
        />
        <p className="text-xs text-muted-foreground">
          Isi jika Anda diajak mendaftar oleh seseorang — Anda akan tercatat sebagai downline-nya.
        </p>
        {errors.referralCode ? (
          <p className="text-sm text-destructive">{errors.referralCode.message}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2 h-11">
        {isSubmitting ? "Memproses..." : "Daftar"}
      </Button>
    </form>
  );
}
