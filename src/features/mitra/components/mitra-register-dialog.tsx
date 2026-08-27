"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { ApiError } from "@/lib/api/client";
import { registerMitraFormSchema, type RegisterMitraFormValues } from "../schemas/register-mitra.schema";
import { registerMitra } from "../services/mitra-api";

const DEFAULT_VALUES: RegisterMitraFormValues = {
  name: "",
  address: "",
  email: "",
  whatsapp: "",
  password: "",
  confirmPassword: "",
  pin: "",
  referralCode: "",
};

// PIN here is the same transaction-confirmation credential
// user_transaction_pins was built for (M02 Architecture Decision #3) —
// this is its first real caller, alongside the login password. Entered
// once (no confirm field) — referralCode, not a PIN retype, is the extra
// field: if set, it must match an existing referral_codes entry and this
// Mitra becomes that code owner's referred user (bumdes.service.ts).
export function MitraRegisterDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterMitraFormValues>({
    resolver: zodResolver(registerMitraFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  async function onSubmit(values: RegisterMitraFormValues) {
    setServerError(null);
    try {
      await registerMitra({
        name: values.name,
        address: values.address,
        email: values.email,
        whatsapp: values.whatsapp,
        password: values.password,
        pin: values.pin,
        referralCode: values.referralCode,
      });
      setOpen(false);
      reset(DEFAULT_VALUES);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal mendaftarkan mitra.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setServerError(null);
      reset(DEFAULT_VALUES);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" className="h-11">
          Daftarkan Mitra
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Daftarkan Mitra Baru</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex max-h-[70vh] flex-1 flex-col gap-4 overflow-y-auto pr-1"
          noValidate
        >
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="mitra-name">Nama Mitra</Label>
            <Input id="mitra-name" className="h-11" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mitra-address">Alamat (opsional)</Label>
            <Input id="mitra-address" className="h-11" {...register("address")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mitra-email">Email</Label>
            <Input
              id="mitra-email"
              type="email"
              className="h-11"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mitra-whatsapp">Nomor WhatsApp</Label>
            <Input
              id="mitra-whatsapp"
              type="tel"
              inputMode="numeric"
              placeholder="08xxxxxxxxxx"
              className="h-11"
              aria-invalid={!!errors.whatsapp}
              {...register("whatsapp")}
            />
            <p className="text-xs text-muted-foreground">Juga bisa dipakai mitra untuk masuk selain email.</p>
            {errors.whatsapp ? <p className="text-sm text-destructive">{errors.whatsapp.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mitra-password">Password</Label>
            <PasswordInput
              id="mitra-password"
              className="h-11"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password ? <p className="text-sm text-destructive">{errors.password.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mitra-confirm-password">Konfirmasi Password</Label>
            <PasswordInput
              id="mitra-confirm-password"
              className="h-11"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mitra-pin">PIN Transaksi (6 digit)</Label>
            <PasswordInput
              id="mitra-pin"
              inputMode="numeric"
              maxLength={6}
              className="h-11"
              aria-invalid={!!errors.pin}
              {...register("pin")}
            />
            {errors.pin ? <p className="text-sm text-destructive">{errors.pin.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="mitra-referral-code">Kode Referensi (opsional)</Label>
            <Input
              id="mitra-referral-code"
              className="h-11"
              placeholder="Kode referral mitra/affiliate yang mereferensikan"
              aria-invalid={!!errors.referralCode}
              {...register("referralCode")}
            />
            <p className="text-xs text-muted-foreground">
              Kosongkan jika mitra ini tidak didaftarkan di bawah referensi siapa pun.
            </p>
            {errors.referralCode ? <p className="text-sm text-destructive">{errors.referralCode.message}</p> : null}
          </div>

          <DialogFooter className="flex-row gap-3 sm:justify-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-11 flex-1">
              {isSubmitting ? "Mendaftarkan..." : "Daftarkan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
