"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      // confirmPassword only exists to validate the form client-side —
      // the server schema (registerServerSchema) never sees it.
      const { confirmPassword: _confirmPassword, ...serverInput } = values;
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
        <Input
          id="password"
          type="password"
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
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          className="h-11"
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2 h-11">
        {isSubmitting ? "Memproses..." : "Daftar"}
      </Button>
    </form>
  );
}
