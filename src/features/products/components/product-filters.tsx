"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category } from "@/types/product";
import { ProductFilterDialog } from "./product-filter-dialog";
import type { ProductFilterValues } from "./product-filter-fields";

export interface ProductFiltersProps {
  categories: Category[];
}

// Search is always visible and submits on its own (real-app search bars
// never hide). Category + status live behind one "Filter" button whose
// dialog/sheet presentation adapts to the viewport — see
// ProductFilterDialog for the mobile-sheet vs tablet/desktop-dialog split.
export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [filterOpen, setFilterOpen] = useState(false);

  const appliedFilters: ProductFilterValues = {
    category: searchParams.get("category") ?? "ALL",
    status: searchParams.get("status") ?? "ALL",
  };
  const activeFilterCount = [appliedFilters.category, appliedFilters.status].filter(
    (value) => value !== "ALL",
  ).length;

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== "ALL") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    updateParams({ search: searchValue || null });
  }

  function handleApplyFilters(values: ProductFilterValues) {
    updateParams({ category: values.category, status: values.status });
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Cari nama produk atau kode SKU..."
            className="h-11 pl-9"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setFilterOpen(true)}
          aria-label="Filter"
          className="h-11 shrink-0 gap-2 px-3"
        >
          <Filter className="size-4" />
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 ? (
            <Badge className="h-5 min-w-5 justify-center rounded-full px-1 text-xs">{activeFilterCount}</Badge>
          ) : null}
        </Button>
      </form>

      <ProductFilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        categories={categories}
        appliedValue={appliedFilters}
        onApply={handleApplyFilters}
      />
    </div>
  );
}
