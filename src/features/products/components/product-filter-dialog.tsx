"use client";

import { useState } from "react";
import { FilterSheet } from "@/components/feedback/filter-sheet";
import type { Category } from "@/types/product";
import {
  DEFAULT_PRODUCT_FILTER_VALUES,
  ProductFilterFields,
  type ProductFilterValues,
} from "./product-filter-fields";

export interface ProductFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  appliedValue: ProductFilterValues;
  onApply: (value: ProductFilterValues) => void;
}

// Filter selections are staged locally and only committed to the URL (via
// onApply) when "Terapkan" is pressed, rather than applying on every
// keystroke/click — see FilterSheet for the responsive shell this uses.
export function ProductFilterDialog({
  open,
  onOpenChange,
  categories,
  appliedValue,
  onApply,
}: ProductFilterDialogProps) {
  const [pending, setPending] = useState<ProductFilterValues>(appliedValue);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      // Discard any staged-but-unapplied edit from the last time this was open.
      setPending(appliedValue);
    }
    onOpenChange(nextOpen);
  }

  function handleApply() {
    onApply(pending);
    onOpenChange(false);
  }

  return (
    <FilterSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Filter Produk"
      onReset={() => setPending(DEFAULT_PRODUCT_FILTER_VALUES)}
      onApply={handleApply}
    >
      <ProductFilterFields categories={categories} value={pending} onChange={setPending} />
    </FilterSheet>
  );
}
