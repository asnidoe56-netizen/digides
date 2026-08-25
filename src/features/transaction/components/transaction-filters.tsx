"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterSheet } from "@/components/feedback/filter-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Semua Status" },
  { value: "PENDING", label: "Pending" },
  { value: "RESERVED", label: "Diproses" },
  { value: "SUCCESS", label: "Berhasil" },
  { value: "FAILED", label: "Gagal" },
  { value: "REFUNDED", label: "Dikembalikan" },
];

export function TransactionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get("search") ?? "");
  const [filterOpen, setFilterOpen] = useState(false);
  const appliedStatus = searchParams.get("status") ?? "ALL";
  const [pendingStatus, setPendingStatus] = useState(appliedStatus);
  const activeFilterCount = appliedStatus !== "ALL" ? 1 : 0;

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

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Cari pemilik, produk, atau no. pelanggan..."
            className="h-11 pl-9"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPendingStatus(appliedStatus);
            setFilterOpen(true);
          }}
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

      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        title="Filter Transaksi"
        onReset={() => {
          setPendingStatus("ALL");
          updateParams({ status: null });
          setFilterOpen(false);
        }}
        onApply={() => {
          updateParams({ status: pendingStatus });
          setFilterOpen(false);
        }}
      >
        <div className="flex flex-col gap-4 p-4 sm:p-0">
          <div className="grid gap-2">
            <Label htmlFor="transaction-filter-status">Status</Label>
            <Select value={pendingStatus} onValueChange={setPendingStatus}>
              <SelectTrigger id="transaction-filter-status" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterSheet>
    </div>
  );
}
