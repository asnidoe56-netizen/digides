"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import type { Brand } from "@/types/product";
import { brandNameSchema, type BrandNameFormValues } from "../schemas/brand.schema";
import { createBrand, renameBrand } from "../services/brand-api";

export interface BrandFormDialogProps {
  brand?: Brand;
  trigger: ReactNode;
}

// One dialog for both "Tambah Brand" and "Ubah Nama" — brands are
// otherwise only ever created implicitly by Digiflazz catalog sync
// (upsertBrand), so this is the one place an admin creates or renames
// one directly. Mirrors CategoryFormDialog exactly.
export function BrandFormDialog({ brand, trigger }: BrandFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BrandNameFormValues>({
    resolver: zodResolver(brandNameSchema),
    defaultValues: { name: brand?.name ?? "" },
  });

  async function onSubmit(values: BrandNameFormValues) {
    setServerError(null);
    try {
      if (brand) {
        await renameBrand(brand.id, values);
      } else {
        await createBrand(values);
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan brand.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset({ name: brand?.name ?? "" });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{brand ? "Ubah Nama Brand" : "Tambah Brand"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="brand-name">Nama Brand</Label>
            <Input id="brand-name" className="h-11" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
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
