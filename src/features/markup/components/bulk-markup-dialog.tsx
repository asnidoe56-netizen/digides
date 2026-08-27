"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import type { Brand, Category, ProductStatus } from "@/types/product";
import { bulkUpdateProductMarkup } from "../services/markup-api";

export interface BulkMarkupDialogProps {
  categories: Category[];
  brands: Brand[];
  /** How many products currently match the filter — shown so the admin
   *  knows exactly how many rows "Terapkan" is about to touch. */
  affectedCount: number;
}

// Reads the SAME category/provider/status/search filter already applied
// via ProductFilters (URL state) and sends it along with one nominal —
// e.g. Kategori "Pulsa" + Provider "TELKOMSEL" -> every matching product's
// markup becomes exactly this value in one action.
export function BulkMarkupDialog({ categories, brands, affectedCount }: BulkMarkupDialogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [markupValue, setMarkupValue] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const categoryId = searchParams.get("category") || undefined;
  const brandId = searchParams.get("brand") || undefined;
  const status = (searchParams.get("status") as ProductStatus | null) || undefined;
  const search = searchParams.get("search") || undefined;

  const categoryName = categoryId ? (categories.find((category) => category.id === categoryId)?.name ?? null) : null;
  const brandName = brandId ? (brands.find((brand) => brand.id === brandId)?.name ?? null) : null;

  // Requires at least a category or provider — same guard as
  // pricing.service.ts's bulkSetProductMarkup, shown here up front instead
  // of only surfacing as a server error after the dialog is already open.
  const hasFilter = Boolean(categoryId || brandId);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setMarkupValue("0");
      setServerError(null);
    }
  }

  async function handleApply() {
    setServerError(null);
    const value = Number(markupValue);
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      setServerError("Nominal markup harus bilangan bulat dan tidak boleh negatif");
      return;
    }

    setIsSubmitting(true);
    try {
      await bulkUpdateProductMarkup({ markupValue: value, categoryId, brandId, status, search });
      setOpen(false);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Gagal menerapkan markup massal.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={!hasFilter}
          title={hasFilter ? undefined : "Pilih kategori atau provider terlebih dahulu dari Filter"}
          className="h-11 gap-2"
        >
          <Layers className="size-4" />
          Terapkan Massal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Terapkan Markup Massal</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {serverError ? (
            <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
              {serverError}
            </p>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Markup ini akan diterapkan ke{" "}
            <span className="font-medium text-foreground">{affectedCount} produk</span> yang cocok dengan filter saat
            ini
            {categoryName ? (
              <>
                {" "}
                — Kategori <span className="font-medium text-foreground">{categoryName}</span>
              </>
            ) : null}
            {brandName ? (
              <>
                {categoryName ? "," : " —"} Provider <span className="font-medium text-foreground">{brandName}</span>
              </>
            ) : null}
            .
          </p>

          <div className="grid gap-2">
            <Label htmlFor="bulk-markup-value">Markup (Rupiah)</Label>
            <Input
              id="bulk-markup-value"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              className="h-11"
              value={markupValue}
              onChange={(event) => setMarkupValue(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-row gap-3 sm:justify-stretch">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 flex-1">
            Batal
          </Button>
          <Button type="button" onClick={handleApply} disabled={isSubmitting} className="h-11 flex-1">
            {isSubmitting ? "Menerapkan..." : "Terapkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
