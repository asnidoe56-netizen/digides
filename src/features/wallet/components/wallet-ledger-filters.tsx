"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletLedgerFilterDialog } from "./wallet-ledger-filter-dialog";
import type { WalletLedgerFilterValues } from "./wallet-ledger-filter-fields";

export interface WalletLedgerFiltersProps {
  /** Which tab this is filtering — preserved in the URL when applying. */
  tab: "mutasi" | "ledger";
  dialogTitle: string;
  searchPlaceholder?: string;
}

export function WalletLedgerFilters({ tab, dialogTitle, searchPlaceholder }: WalletLedgerFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [filterOpen, setFilterOpen] = useState(false);

  const appliedFilters: WalletLedgerFilterValues = {
    type: searchParams.get("type") ?? "ALL",
    channel: searchParams.get("channel") ?? "ALL",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
  };
  const activeFilterCount = [
    appliedFilters.type !== "ALL",
    appliedFilters.channel !== "ALL",
    appliedFilters.dateFrom !== "",
    appliedFilters.dateTo !== "",
  ].filter(Boolean).length;

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
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

  function handleApplyFilters(values: WalletLedgerFilterValues) {
    updateParams({
      type: values.type,
      channel: values.channel,
      dateFrom: values.dateFrom || null,
      dateTo: values.dateTo || null,
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
            placeholder={searchPlaceholder ?? "Cari pemilik atau reference..."}
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

      <WalletLedgerFilterDialog
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title={dialogTitle}
        appliedValue={appliedFilters}
        onApply={handleApplyFilters}
      />
    </div>
  );
}
