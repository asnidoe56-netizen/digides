"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import {
  supportSettingsFormSchema,
  type SupportSettingsFormValues,
} from "../schemas/support-settings.schema";
import { saveSupportSettings } from "../services/support-settings-api";

export interface SupportSettingsFormProps {
  /** Whatever's stored in support_settings.whatsapp_number, already in
   *  local 08xx form for display — see toLocalFormat() in the page. */
  initialWhatsappNumber: string;
}

export function SupportSettingsForm({ initialWhatsappNumber }: SupportSettingsFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupportSettingsFormValues>({
    resolver: zodResolver(supportSettingsFormSchema),
    defaultValues: { whatsapp_number: initialWhatsappNumber },
  });

  async function onSubmit(values: SupportSettingsFormValues) {
    setServerError(null);
    setSuccessMessage(null);
    try {
      await saveSupportSettings(values);
      setSuccessMessage("Nomor WhatsApp bantuan berhasil disimpan.");
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
        <Label htmlFor="whatsapp_number">Nomor WhatsApp Bantuan</Label>
        <Input
          id="whatsapp_number"
          className="h-11"
          placeholder="08xxxxxxxxxx"
          {...register("whatsapp_number")}
        />
        <p className="text-xs text-muted-foreground">
          Dibuka saat pengguna menekan ikon tanda tanya di Beranda aplikasi Mitra — bisa format 08xx
          maupun 62xx, akan dirapikan otomatis.
        </p>
        {errors.whatsapp_number ? (
          <p className="text-sm text-destructive">{errors.whatsapp_number.message}</p>
        ) : null}
      </div>

      <div className="mt-2">
        <Button type="submit" disabled={isSubmitting} className="h-11 w-fit">
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
