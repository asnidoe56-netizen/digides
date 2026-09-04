"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterSheet } from "@/components/feedback/filter-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OWNER_TYPE_OPTIONS = [
  { value: "ALL", label: "Semua Pemilik" },
  { value: "BUMDES", label: "BUMDes" },
  { value: "KONTER", label: "Konter" },
  { value: "USER", label: "Affiliate" },
];

const FILTER_KEYS = ["dateFrom", "dateTo", "ownerType"] as const;

// Same date-range + owner-type shape as ReportFilters (Laporan), scoped
// down to what sumTransactionProfit's filter actually accepts — no
// channel/type dimension here, those are wallet_ledger concepts, not
// transaction ones.
export function ProfitFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const applied = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""]));
  const [pending, setPending] = useState(applied);

  const activeFilterCount = FILTER_KEYS.filter((key) => applied[key] && applied[key] !== "ALL").length;

  function updateParams(values: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of FILTER_KEYS) {
      const value = values[key];
      if (value && value !== "ALL") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setPending(applied);
          setOpen(true);
        }}
        className="h-11 gap-2"
      >
        <Filter className="size-4" />
        Filter
        {activeFilterCount > 0 ? (
          <Badge className="h-5 min-w-5 justify-center rounded-full px-1 text-xs">{activeFilterCount}</Badge>
        ) : null}
      </Button>

      <FilterSheet
        open={open}
        onOpenChange={setOpen}
        title="Filter Keuntungan"
        onReset={() => {
          const cleared = Object.fromEntries(FILTER_KEYS.map((key) => [key, ""]));
          setPending(cleared);
          updateParams(cleared);
          setOpen(false);
        }}
        onApply={() => {
          updateParams(pending);
          setOpen(false);
        }}
      >
        <div className="flex flex-col gap-4 p-4 sm:p-0">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="profit-date-from">Dari Tanggal</Label>
              <Input
                id="profit-date-from"
                type="date"
                className="h-11"
                value={pending.dateFrom}
                onChange={(event) => setPending((prev) => ({ ...prev, dateFrom: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profit-date-to">Sampai Tanggal</Label>
              <Input
                id="profit-date-to"
                type="date"
                className="h-11"
                value={pending.dateTo}
                onChange={(event) => setPending((prev) => ({ ...prev, dateTo: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profit-owner-type">Pemilik</Label>
            <Select
              value={pending.ownerType || "ALL"}
              onValueChange={(value) => setPending((prev) => ({ ...prev, ownerType: value }))}
            >
              <SelectTrigger id="profit-owner-type" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OWNER_TYPE_OPTIONS.map((option) => (
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
