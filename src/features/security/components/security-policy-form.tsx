"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import type { SecurityPolicy } from "@/types/security";
import { securityPolicySchema, type SecurityPolicyFormValues } from "../schemas/policy.schema";
import { saveSecurityPolicy } from "../services/security-api";

export function SecurityPolicyForm({ policy }: { policy: SecurityPolicy }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SecurityPolicyFormValues>({
    resolver: zodResolver(securityPolicySchema),
    defaultValues: {
      max_devices_per_user: policy.max_devices_per_user,
      max_login_attempts: policy.max_login_attempts,
      login_lockout_minutes: policy.login_lockout_minutes,
      require_device_verification: policy.require_device_verification,
      session_timeout_minutes: policy.session_timeout_minutes,
      max_pin_attempts: policy.max_pin_attempts,
      pin_lockout_minutes: policy.pin_lockout_minutes,
    },
  });

  async function onSubmit(values: SecurityPolicyFormValues) {
    setServerError(null);
    setSuccessMessage(null);
    try {
      await saveSecurityPolicy(values);
      setSuccessMessage("Kebijakan keamanan berhasil disimpan.");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan kebijakan.");
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
        <Label htmlFor="max_devices_per_user">Batas Jumlah Perangkat per Pengguna</Label>
        <Input
          id="max_devices_per_user"
          type="number"
          className="h-11"
          aria-invalid={!!errors.max_devices_per_user}
          {...register("max_devices_per_user")}
        />
        {errors.max_devices_per_user ? (
          <p className="text-sm text-destructive">{errors.max_devices_per_user.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="max_login_attempts">Batas Percobaan Login Gagal</Label>
        <Input
          id="max_login_attempts"
          type="number"
          className="h-11"
          aria-invalid={!!errors.max_login_attempts}
          {...register("max_login_attempts")}
        />
        {errors.max_login_attempts ? <p className="text-sm text-destructive">{errors.max_login_attempts.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="login_lockout_minutes">Durasi Cooldown Login Terkunci (menit)</Label>
        <Input
          id="login_lockout_minutes"
          type="number"
          className="h-11"
          aria-invalid={!!errors.login_lockout_minutes}
          {...register("login_lockout_minutes")}
        />
        {errors.login_lockout_minutes ? (
          <p className="text-sm text-destructive">{errors.login_lockout_minutes.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="max_pin_attempts">Batas Percobaan PIN Gagal</Label>
        <Input
          id="max_pin_attempts"
          type="number"
          className="h-11"
          aria-invalid={!!errors.max_pin_attempts}
          {...register("max_pin_attempts")}
        />
        {errors.max_pin_attempts ? <p className="text-sm text-destructive">{errors.max_pin_attempts.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="pin_lockout_minutes">Durasi Cooldown PIN Terkunci (menit)</Label>
        <Input
          id="pin_lockout_minutes"
          type="number"
          className="h-11"
          aria-invalid={!!errors.pin_lockout_minutes}
          {...register("pin_lockout_minutes")}
        />
        {errors.pin_lockout_minutes ? <p className="text-sm text-destructive">{errors.pin_lockout_minutes.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="session_timeout_minutes">Session Timeout / Idle (menit)</Label>
        <Input
          id="session_timeout_minutes"
          type="number"
          className="h-11"
          aria-invalid={!!errors.session_timeout_minutes}
          {...register("session_timeout_minutes")}
        />
        <p className="text-xs text-muted-foreground">
          Sesi otomatis dianggap habis jika tidak ada aktivitas selama durasi ini, terlepas dari masa berlaku 7 hari cookie login.
        </p>
        {errors.session_timeout_minutes ? (
          <p className="text-sm text-destructive">{errors.session_timeout_minutes.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="require_device_verification">Wajib Verifikasi Perangkat Baru</Label>
        <Controller
          control={control}
          name="require_device_verification"
          render={({ field }) => (
            <Select value={field.value ? "true" : "false"} onValueChange={(value) => field.onChange(value === "true")}>
              <SelectTrigger id="require_device_verification" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">Tidak — perangkat baru langsung dipercaya</SelectItem>
                <SelectItem value="true">Ya — perangkat baru menunggu persetujuan admin</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-2 h-11 w-fit">
        {isSubmitting ? "Menyimpan..." : "Simpan Kebijakan"}
      </Button>
    </form>
  );
}
