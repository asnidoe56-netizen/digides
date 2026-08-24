"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import type { DigiflazzSettingsView } from "@/services/digiflazz.service";
import {
  digiflazzSettingsServerSchema,
  type DigiflazzSettingsFormValues,
} from "../schemas/digiflazz-settings.schema";
import { saveDigiflazzSettings, testDigiflazzConnection } from "../services/digiflazz-api";

export interface DigiflazzSettingsFormProps {
  initialSettings: DigiflazzSettingsView | null;
}

// Key inputs are always rendered empty — the real value never reaches the
// browser (see digiflazz.service.ts's getDigiflazzSettingsForDisplay).
// The placeholder shows the masked tail of whatever's already stored so
// the admin can tell a key is set without ever seeing it, and leaving the
// field blank on submit means "keep the current key," not "erase it."
export function DigiflazzSettingsForm({ initialSettings }: DigiflazzSettingsFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DigiflazzSettingsFormValues>({
    resolver: zodResolver(digiflazzSettingsServerSchema),
    defaultValues: {
      username: initialSettings?.username ?? "",
      base_url: initialSettings?.base_url ?? "https://api.digiflazz.com/v1",
      mode: initialSettings?.mode ?? "development",
      dev_key: "",
      prod_key: "",
    },
  });

  async function onSubmit(values: DigiflazzSettingsFormValues) {
    setServerError(null);
    setSuccessMessage(null);
    setTestResult(null);
    try {
      await saveDigiflazzSettings(values);
      setSuccessMessage("Kredensial Digiflazz berhasil disimpan.");
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan. Coba lagi.");
    }
  }

  // Tests whatever is currently saved in the database, not the form's
  // in-progress values — save first if you just changed something.
  async function onTestConnection() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testDigiflazzConnection();
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
        <Label htmlFor="username">Username Digiflazz</Label>
        <Input id="username" className="h-11" aria-invalid={!!errors.username} {...register("username")} />
        {errors.username ? <p className="text-sm text-destructive">{errors.username.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="base_url">Base URL API</Label>
        <Input id="base_url" className="h-11" aria-invalid={!!errors.base_url} {...register("base_url")} />
        {errors.base_url ? <p className="text-sm text-destructive">{errors.base_url.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="dev_key">API Key Development</Label>
        <Input
          id="dev_key"
          type="password"
          autoComplete="off"
          className="h-11"
          placeholder={
            initialSettings?.dev_key_masked ? `Sudah diatur (${initialSettings.dev_key_masked})` : "Belum diatur"
          }
          aria-invalid={!!errors.dev_key}
          {...register("dev_key")}
        />
        <p className="text-xs text-muted-foreground">Kosongkan jika tidak ingin mengubah key yang sudah tersimpan.</p>
        {errors.dev_key ? <p className="text-sm text-destructive">{errors.dev_key.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="prod_key">API Key Production</Label>
        <Input
          id="prod_key"
          type="password"
          autoComplete="off"
          className="h-11"
          placeholder={
            initialSettings?.prod_key_masked ? `Sudah diatur (${initialSettings.prod_key_masked})` : "Belum diatur"
          }
          aria-invalid={!!errors.prod_key}
          {...register("prod_key")}
        />
        <p className="text-xs text-muted-foreground">Kosongkan jika tidak ingin mengubah key yang sudah tersimpan.</p>
        {errors.prod_key ? <p className="text-sm text-destructive">{errors.prod_key.message}</p> : null}
      </div>

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
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-muted-foreground">
          Menentukan key mana (development/production) yang dipakai saat aplikasi memanggil Digiflazz.
        </p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting} className="h-11 w-fit">
          {isSubmitting ? "Menyimpan..." : "Simpan Kredensial"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isTesting}
          onClick={onTestConnection}
          className="h-11 w-fit"
        >
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
