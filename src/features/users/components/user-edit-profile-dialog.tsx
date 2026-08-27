"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import type { PublicUserProfile } from "@/types/user";
import { updateUserProfileSchema, type UpdateUserProfileValues } from "../schemas/user-profile.schema";
import { updateUserProfile } from "../services/users-api";

export interface UserEditProfileDialogProps {
  // PublicUserProfile, not the full User row — see security audit SEC-01.
  // Never widen this to `User`/`UserWithRoles`, even structurally
  // compatible ones: a caller passing the full row would silently ship
  // password_hash into this Client Component's props.
  user: PublicUserProfile;
  /** Plain text link/button style, so this fits both the list row's
   *  compact "Edit" action and the detail page's more prominent one. */
  triggerLabel?: string;
}

// Fills in or corrects a user's identity fields after the account already
// exists — most commonly a WhatsApp number that wasn't collected at
// registration time (e.g. an AFFILIATE who self-signed-up with just
// email). Separate from UserStatusActions, which only ever touches status.
export function UserEditProfileDialog({ user, triggerLabel = "Edit Profil" }: UserEditProfileDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultValues: UpdateUserProfileValues = {
    fullName: user.full_name,
    email: user.email,
    phone: user.phone ?? "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserProfileValues>({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues,
  });

  async function onSubmit(values: UpdateUserProfileValues) {
    setServerError(null);
    try {
      await updateUserProfile(user.id, values);
      setOpen(false);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal memperbarui profil.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setServerError(null);
      reset(defaultValues);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="h-9">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profil Pengguna</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
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

          <DialogFooter className="flex-row gap-3 sm:justify-stretch">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-11 flex-1">
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
