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
import type { ProductMarkupRow } from "@/repositories/product.repository";
import { productMarkupSchema, type ProductMarkupFormValues } from "../schemas/product-markup.schema";
import { updateProductMarkup } from "../services/markup-api";

export interface ProductMarkupEditDialogProps {
  product: ProductMarkupRow;
  trigger: ReactNode;
}

// Editing here always writes this one product's own MASTER/PRODUCT markup
// rule (pricing.service.ts's setProductMarkup) — never a second competing
// rule, enforced at the DB level by markup_rules_master_product_active_uidx.
// This takes priority over whatever brand/category/global markup the
// product would otherwise fall back to.
export function ProductMarkupEditDialog({ product, trigger }: ProductMarkupEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const startingValue = Number(product.product_markup_value ?? product.effective_markup_value);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductMarkupFormValues>({
    resolver: zodResolver(productMarkupSchema),
    defaultValues: { markupValue: startingValue },
  });

  const markupValue = useWatch({ control, name: "markupValue" });

  async function onSubmit(values: ProductMarkupFormValues) {
    setServerError(null);
    try {
      await updateProductMarkup(product.id, values);
      setOpen(false);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menyimpan markup.");
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) reset({ markupValue: startingValue });
  }

  const previewMarkup = Number.isFinite(markupValue) ? markupValue : 0;
  const basePrice = Number(product.base_price);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Markup {product.product_name}</DialogTitle>
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
            Harga dasar {formatMoney(basePrice)} akan menjadi{" "}
            <span className="font-medium text-foreground">{formatMoney(basePrice + previewMarkup)}</span> di sisi
            agen/pengguna — menggantikan markup kategori/brand yang berlaku untuk produk ini.
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
