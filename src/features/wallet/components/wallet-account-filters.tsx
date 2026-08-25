"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletAccountFilterDialog } from "./wallet-account-filter-dialog";
import type { WalletAccountFilterValues } from "./wallet-account-filter-fields";

export function WalletAccountFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [filterOpen, setFilterOpen] = useState(false);

  const appliedFilters: WalletAccountFilterValues = {
    accountType: searchParams.get("accountType") ?? "ALL",
    status: searchParams.get("status") ?? "ALL",
    minBalance: searchParams.get("minBalance") ?? "",
    maxBalance: searchParams.get("maxBalance") ?? "",
  };
  const activeFilterCount = [
    appliedFilters.accountType !== "ALL",
    appliedFilters.status !== "ALL",
    appliedFilters.minBalance !== "",
    appliedFilters.maxBalance !== "",
  ].filter(Boolean).length;

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "accounts");
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

  function handleApplyFilters(values: WalletAccountFilterValues) {
    updateParams({
      accountType: values.accountType,
      status: values.status,
      minBalance: values.minBalance || null,
      maxBalance: values.maxBalance || null,
    });
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
            placeholder="Cari nama pemilik..."
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

      <WalletAccountFilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        appliedValue={appliedFilters}
        onApply={handleApplyFilters}
      />
    </div>
  );
}
