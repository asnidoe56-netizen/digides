"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type PeriodKey = "week" | "month" | "year" | "custom";

const PERIOD_OPTIONS: Array<{ value: PeriodKey; label: string }> = [
  { value: "week", label: "Mingguan" },
  { value: "month", label: "Bulanan" },
  { value: "year", label: "Tahunan" },
  { value: "custom", label: "Kustom" },
];

export interface PeriodSelectorProps {
  activePeriod: PeriodKey;
  dateFrom?: string;
  dateTo?: string;
}

// URL state, same pattern as every other filter in this app (WalletLedgerFilters,
// TransactionFilters) — the selected period/range survives a refresh and is
// shareable, and switching tabs (Transaksi/Mutasi/Rekap) doesn't lose it.
export function PeriodSelector({ activePeriod, dateFrom, dateTo }: PeriodSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [customFrom, setCustomFrom] = useState(dateFrom ?? "");
  const [customTo, setCustomTo] = useState(dateTo ?? "");

  function setPeriod(period: PeriodKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", period);
    if (period !== "custom") {
      params.delete("dateFrom");
      params.delete("dateTo");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyCustomRange() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    if (customFrom) params.set("dateFrom", customFrom);
    if (customTo) params.set("dateTo", customTo);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="print:hidden flex flex-col gap-3">
      <div className="flex gap-2 overflow-x-auto">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPeriod(option.value)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              activePeriod === option.value
                ? "border-red-600 bg-red-600 text-white"
                : "border-input text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {activePeriod === "custom" ? (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={customFrom}
            onChange={(event) => setCustomFrom(event.target.value)}
            className="h-10"
          />
          <span className="text-sm text-muted-foreground">s/d</span>
          <Input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} className="h-10" />
          <Button type="button" size="sm" onClick={applyCustomRange} className="h-10 bg-red-600 hover:bg-red-700">
            Terapkan
          </Button>
        </div>
      ) : null}
    </div>
  );
}
