"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import type { MidtransSettingsView } from "@/services/midtrans.service";
import {
  midtransSettingsServerSchema,
  type MidtransSettingsFormValues,
} from "../schemas/midtrans-settings.schema";
import { saveMidtransSettings, testMidtransConnection } from "../services/midtrans-api";

export interface MidtransSettingsFormProps {
  initialSettings: MidtransSettingsView | null;
}

// Same UX contract as DigiflazzSettingsForm: key inputs always render
// empty (the real value never reaches the browser), the placeholder shows
// the masked tail of whatever's already stored, and leaving a field blank
// on submit means "keep the current key," not "erase it."
export function MidtransSettingsForm({ initialSettings }: MidtransSettingsFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MidtransSettingsFormValues>({
    resolver: zodResolver(midtransSettingsServerSchema),
    defaultValues: {
      mode: initialSettings?.mode ?? "sandbox",
      merchant_id: initialSettings?.merchant_id ?? "",
      sandbox_server_key: "",
      sandbox_client_key: "",
      production_server_key: "",
      production_client_key: "",
    },
  });

  async function onSubmit(values: MidtransSettingsFormValues) {
    setServerError(null);
    setSuccessMessage(null);
    try {
      await saveMidtransSettings(values);
      setSuccessMessage("Kredensial Midtrans berhasil disimpan.");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan. Coba lagi.");
    }
  }

  async function onTestConnection() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testMidtransConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof ApiError ? error.message : "Gagal menguji koneksi. Coba lagi.",
      });
    } finally {
      setIsTesting(false);
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
        <Label htmlFor="merchant_id">Merchant ID (opsional)</Label>
        <Input id="merchant_id" className="h-11" {...register("merchant_id")} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sandbox_server_key">Sandbox Server Key</Label>
        <Input
          id="sandbox_server_key"
          type="password"
          autoComplete="off"
          className="h-11"
          placeholder={
            initialSettings?.sandbox_server_key_masked
              ? `Sudah diatur (${initialSettings.sandbox_server_key_masked})`
              : "Belum diatur"
          }
          {...register("sandbox_server_key")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sandbox_client_key">Sandbox Client Key</Label>
        <Input
          id="sandbox_client_key"
          type="password"
          autoComplete="off"
          className="h-11"
          placeholder={
            initialSettings?.sandbox_client_key_masked
              ? `Sudah diatur (${initialSettings.sandbox_client_key_masked})`
              : "Belum diatur"
          }
          {...register("sandbox_client_key")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="production_server_key">Production Server Key</Label>
        <Input
          id="production_server_key"
          type="password"
          autoComplete="off"
          className="h-11"
          placeholder={
            initialSettings?.production_server_key_masked
              ? `Sudah diatur (${initialSettings.production_server_key_masked})`
              : "Belum diatur"
          }
          {...register("production_server_key")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="production_client_key">Production Client Key</Label>
        <Input
          id="production_client_key"
          type="password"
          autoComplete="off"
          className="h-11"
          placeholder={
            initialSettings?.production_client_key_masked
              ? `Sudah diatur (${initialSettings.production_client_key_masked})`
              : "Belum diatur"
          }
          {...register("production_client_key")}
        />
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Kosongkan field key yang tidak ingin diubah — key yang sudah tersimpan akan tetap dipakai.
      </p>

      <div className="grid gap-2">
        <Label htmlFor="mode">Mode Aktif</Label>
        <Controller
          control={control}
          name="mode"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="mode" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Menentukan pasangan key (sandbox/production) mana yang dipakai saat aplikasi memanggil Midtrans.
        </p>
        {errors.mode ? <p className="text-sm text-destructive">{errors.mode.message}</p> : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting} className="h-11 w-fit">
          {isSubmitting ? "Menyimpan..." : "Simpan Kredensial"}
        </Button>
        <Button type="button" variant="outline" disabled={isTesting} onClick={onTestConnection} className="h-11 w-fit">
          {isTesting ? "Menguji..." : "Test Koneksi"}
        </Button>
      </div>

      {testResult ? (
        <p
          role="status"
          className={
            testResult.success
              ? "rounded-md bg-status-success px-3 py-2 text-sm text-status-success-foreground"
              : "rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground"
          }
        >
          {testResult.message}
        </p>
      ) : null}
    </form>
  );
}
