"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import type { MerchandisingTag, Product } from "@/types/product";
import { setProductTag } from "../services/products-api";

// Purely a storefront label (Super Murah/Promo/Terlaris) an admin sets
// themselves — saves immediately on change, no separate dialog, since
// there's nothing destructive to confirm here (unlike availability).
export function ProductTagSelect({ product }: { product: Product }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(value: string) {
    setIsSaving(true);
    setError(null);
    try {
      await setProductTag(product.id, value === "NONE" ? null : (value as MerchandisingTag));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah label.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Select value={product.merchandising_tag ?? "NONE"} onValueChange={handleChange} disabled={isSaving}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="NONE">Tanpa label</SelectItem>
          <SelectItem value="SUPER_MURAH">Super Murah</SelectItem>
          <SelectItem value="PROMO">Promo</SelectItem>
          <SelectItem value="TERLARIS">Terlaris</SelectItem>
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
