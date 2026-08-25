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
import type { Category } from "@/types/product";
import { categoryNameSchema, type CategoryNameFormValues } from "../schemas/category.schema";
import { createCategory, renameCategory } from "../services/category-api";

export interface CategoryFormDialogProps {
  category?: Category;
  trigger: ReactNode;
}

// One dialog for both "Tambah Kategori" and "Ubah Nama" — categories are
// otherwise only ever created implicitly by Digiflazz catalog sync
// (upsertCategory), so this is the one place an admin creates or renames
// one directly.
export function CategoryFormDialog({ category, trigger }: CategoryFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryNameFormValues>({
    resolver: zodResolver(categoryNameSchema),
    defaultValues: { name: category?.name ?? "" },
  });

  async function onSubmit(values: CategoryNameFormValues) {
    setServerError(null);
    try {
      if (category) {
        await renameCategory(category.id, values);
      } else {
        await createCategory(values);
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan kategori.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset({ name: category?.name ?? "" });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{category ? "Ubah Nama Kategori" : "Tambah Kategori"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="category-name">Nama Kategori</Label>
            <Input id="category-name" className="h-11" aria-invalid={!!errors.name} {...register("name")} />
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
