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
import { loginSchema, type LoginFormValues } from "../schemas/login.schema";
import { loginUser } from "../services/auth-api";

// Where each role lands after login. BUMDES_ADMIN and KONTER now have a
// real home screen — AFFILIATE still falls back to "/" until their
// dashboard exists, rather than sending them to a route that 404s.
function destinationForRoles(roles: string[] | undefined): string {
  if (roles?.includes("SUPER_ADMIN")) return "/dashboard/super-admin/dashboard";
  if (roles?.includes("BUMDES_ADMIN")) return "/dashboard/bumdes/dashboard";
  if (roles?.includes("KONTER")) return "/dashboard/konter/dashboard";
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
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          className="h-11"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2 h-11">
        {isSubmitting ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}
