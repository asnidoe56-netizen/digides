"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/formatting/money";
import { ApiError } from "@/lib/api/client";
import type { CategoryMarkup } from "@/repositories/product.repository";
import { categoryMarkupSchema, type CategoryMarkupFormValues } from "../schemas/category-markup.schema";
import { updateCategoryMarkup } from "../services/markup-api";

const EXAMPLE_BASE_PRICE = 10000;

export interface CategoryMarkupEditDialogProps {
  category: CategoryMarkup;
  trigger: ReactNode;
}

// Editing here always writes the one active MASTER/CATEGORY markup rule
// for this category (pricing.service.ts's setCategoryMarkup) — never a
// second competing rule, enforced at the DB level by
// markup_rules_master_category_active_uidx.
export function CategoryMarkupEditDialog({ category, trigger }: CategoryMarkupEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CategoryMarkupFormValues>({
    resolver: zodResolver(categoryMarkupSchema),
    defaultValues: { markupValue: Number(category.markup_value) },
  });

  const markupValue = useWatch({ control, name: "markupValue" });

  async function onSubmit(values: CategoryMarkupFormValues) {
    setServerError(null);
    try {
      await updateCategoryMarkup(category.category_id, values);
      setOpen(false);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan markup.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset({ markupValue: Number(category.markup_value) });
  }

  const previewMarkup = Number.isFinite(markupValue) ? markupValue : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Markup {category.category_name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-4 overflow-y-auto" noValidate>
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="markup-value">Markup (Rupiah)</Label>
            <Input
              id="markup-value"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              className="h-11"
              aria-invalid={!!errors.markupValue}
              {...register("markupValue", { valueAsNumber: true })}
            />
            {errors.markupValue ? <p className="text-sm text-destructive">{errors.markupValue.message}</p> : null}
          </div>

          <p className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
            Contoh: harga dasar {formatMoney(EXAMPLE_BASE_PRICE)} akan menjadi{" "}
            <span className="font-medium text-foreground">
              {formatMoney(EXAMPLE_BASE_PRICE + previewMarkup)}
            </span>{" "}
            di sisi agen/pengguna.
          </p>

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
