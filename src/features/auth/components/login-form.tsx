"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Fingerprint, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { ApiError } from "@/lib/api/client";
import { loginSchema, type LoginFormValues } from "../schemas/login.schema";
import { loginUser } from "../services/auth-api";

// Where each role lands after login. AFFILIATE's only page today is Menu
// Mitra (their referral code, downline, and reward status) — there's no
// Beranda/Laporan/Akun for them yet, so login sends them straight there
// instead of a home screen that doesn't exist.
function destinationForRoles(roles: string[] | undefined): string {
  if (roles?.includes("SUPER_ADMIN")) return "/dashboard/super-admin/dashboard";
  if (roles?.includes("BUMDES_ADMIN")) return "/dashboard/bumdes/dashboard";
  if (roles?.includes("KONTER")) return "/dashboard/konter/dashboard";
  if (roles?.includes("AFFILIATE")) return "/dashboard/affiliate/mitra";
  return "/";
}

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const user = await loginUser(values);
      router.push(destinationForRoles(user.roles));
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal masuk. Coba lagi.");
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
        <Label htmlFor="identifier">Email / No. WhatsApp</Label>
        <div className="relative">
          <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="identifier"
            autoComplete="username"
            placeholder="nama@email.com atau 08xxxxxxxxxx"
            className="h-12 pl-10"
            aria-invalid={!!errors.identifier}
            {...register("identifier")}
          />
        </div>
        {errors.identifier ? <p className="text-sm text-destructive">{errors.identifier.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="Password"
            className="h-12 pl-10"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </div>
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox defaultChecked />
          Ingat saya
        </label>
        {/* Forgot-password isn't built yet — shown per design, intentionally
            not a real link (no route to send it to) rather than a dead 404. */}
        <span className="text-sm font-medium text-destructive">Lupa password?</span>
      </div>

      <Button type="submit" disabled={isSubmitting} className="h-12 rounded-full bg-red-600 hover:bg-red-700">
        {isSubmitting ? "Memproses..." : "Masuk"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        atau
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Fingerprint login — shown per design, deliberately non-functional
          (disabled) until the underlying biometric/WebAuthn flow exists. */}
      <Button
        type="button"
        disabled
        variant="outline"
        className="h-12 gap-2 rounded-full border-red-600 text-red-600 hover:bg-red-50 disabled:opacity-100"
      >
        <Fingerprint className="size-4" />
        Masuk dengan Sidik Jari
      </Button>
    </form>
  );
}
