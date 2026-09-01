"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { mitraProfileSchema, type MitraProfileValues } from "../schemas/profile.schema";
import { updateMyProfile } from "../services/account-api";

export interface MitraProfileViewProps {
  backHref: string;
  fullName: string;
  email: string;
  phone: string | null;
}

// Reached from Akun > Profil — the same users row Super Admin's Pengguna
// > Lihat Detail > Edit Profil edits, just self-scoped (see
// PATCH /api/account/profile). A mitra who registered without a WhatsApp
// number, or whose Super Admin already filled it in, sees/edits the
// current value here either way.
export function MitraProfileView({ backHref, fullName, email, phone }: MitraProfileViewProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const defaultValues: MitraProfileValues = { fullName, email, phone: phone ?? "" };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MitraProfileValues>({
    resolver: zodResolver(mitraProfileSchema),
    defaultValues,
  });

  async function onSubmit(values: MitraProfileValues) {
    setServerError(null);
    setSuccessMessage(null);
    try {
      await updateMyProfile(values);
      setSuccessMessage("Profil berhasil diperbarui.");
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal memperbarui profil.");
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
        <p className="font-semibold">Profil Saya</p>
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
          <Label htmlFor="profile-full-name">Nama Lengkap</Label>
          <Input
            id="profile-full-name"
            className="h-11"
            aria-invalid={!!errors.fullName}
            {...register("fullName")}
          />
          {errors.fullName ? <p className="text-sm text-destructive">{errors.fullName.message}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            type="email"
            className="h-11"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="profile-phone">Nomor WhatsApp</Label>
          <Input
            id="profile-phone"
            type="tel"
            inputMode="numeric"
            placeholder="08xxxxxxxxxx"
            className="h-11"
            aria-invalid={!!errors.phone}
            {...register("phone")}
          />
          {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
        </div>

        <Button type="submit" disabled={isSubmitting} className="h-11 bg-red-600 hover:bg-red-700">
          {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </form>
    </div>
  );
}
