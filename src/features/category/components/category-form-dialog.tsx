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
import {
  categoryDisplayNameSchema,
  categoryNameSchema,
  type CategoryDisplayNameFormValues,
  type CategoryNameFormValues,
} from "../schemas/category.schema";
import { createCategory, setCategoryDisplayName } from "../services/category-api";

export interface CategoryFormDialogProps {
  category?: Category;
  trigger: ReactNode;
}

// "Tambah Kategori" creates a brand-new category by its raw (Digiflazz)
// name — rare, since categories are normally created implicitly by catalog
// sync. "Ubah Nama Tampilan" only ever touches display_name, never `name`:
// `name` is what catalog-sync matches Digiflazz categories by, so editing
// it here would silently break sync the same way it used to before this
// field split existed (see CATEGORY_DISPLAY_NAME_CHANGED vs the old, now
// removed, CATEGORY_RENAMED action).
export function CategoryFormDialog({ category, trigger }: CategoryFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const createForm = useForm<CategoryNameFormValues>({
    resolver: zodResolver(categoryNameSchema),
    defaultValues: { name: "" },
  });

  const editForm = useForm<CategoryDisplayNameFormValues>({
    resolver: zodResolver(categoryDisplayNameSchema),
    defaultValues: { displayName: category?.display_name ?? category?.name ?? "" },
  });

  async function onSubmitCreate(values: CategoryNameFormValues) {
    setServerError(null);
    try {
      await createCategory(values);
      setOpen(false);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan kategori.");
    }
  }

  async function onSubmitEdit(values: CategoryDisplayNameFormValues) {
    if (!category) return;
    setServerError(null);
    try {
      await setCategoryDisplayName(category.id, values);
      setOpen(false);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan nama tampilan.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      createForm.reset({ name: "" });
      editForm.reset({ displayName: category?.display_name ?? category?.name ?? "" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{category ? "Ubah Nama Tampilan" : "Tambah Kategori"}</DialogTitle>
        </DialogHeader>

        {category ? (
          <form
            onSubmit={editForm.handleSubmit(onSubmitEdit)}
            className="flex flex-1 flex-col gap-4 overflow-y-auto"
            noValidate
          >
            {serverError ? (
              <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
                {serverError}
              </p>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="category-display-name">Nama Tampilan</Label>
              <Input
                id="category-display-name"
                className="h-11"
                aria-invalid={!!editForm.formState.errors.displayName}
                {...editForm.register("displayName")}
              />
              {editForm.formState.errors.displayName ? (
                <p className="text-sm text-destructive">{editForm.formState.errors.displayName.message}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Ini hanya mengubah label yang dilihat pengguna. Nama asli dari Digiflazz (
                <span className="font-medium text-foreground">{category.name}</span>) tetap dipakai untuk
                sinkronisasi katalog dan tidak berubah.
              </p>
            </div>

            <DialogFooter className="flex-row gap-3 sm:justify-stretch">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
                Batal
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting} className="h-11 flex-1">
                {editForm.formState.isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form
            onSubmit={createForm.handleSubmit(onSubmitCreate)}
            className="flex flex-1 flex-col gap-4 overflow-y-auto"
            noValidate
          >
            {serverError ? (
              <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
                {serverError}
              </p>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="category-name">Nama Kategori</Label>
              <Input
                id="category-name"
                className="h-11"
                aria-invalid={!!createForm.formState.errors.name}
                {...createForm.register("name")}
              />
              {createForm.formState.errors.name ? (
                <p className="text-sm text-destructive">{createForm.formState.errors.name.message}</p>
              ) : null}
            </div>

            <DialogFooter className="flex-row gap-3 sm:justify-stretch">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
                Batal
              </Button>
              <Button type="submit" disabled={createForm.formState.isSubmitting} className="h-11 flex-1">
                {createForm.formState.isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
