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

const CHANNEL_OPTIONS = [
  { value: "ALL", label: "Semua Channel" },
  { value: "WEB", label: "Web" },
  { value: "TELEGRAM", label: "Telegram" },
  { value: "ADMIN", label: "Admin" },
  { value: "SYSTEM", label: "System" },
];

const TYPE_OPTIONS = [
  { value: "ALL", label: "Semua Tipe" },
  { value: "TOPUP", label: "Top Up" },
  { value: "DEBIT", label: "Debit" },
  { value: "RESERVE", label: "Reserve" },
  { value: "RELEASE", label: "Release" },
  { value: "REFUND", label: "Refund" },
  { value: "COMMISSION", label: "Komisi" },
  { value: "PAYOUT", label: "Payout" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

const FILTER_KEYS = ["dateFrom", "dateTo", "ownerType", "channel", "type"] as const;

// Issue M18 §38: Date, BUMDes/Konter/Affiliate, Channel, Transaction Type
// — all four filter dimensions the Laporan menu is required to support.
export function ReportFilters() {
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
        title="Filter Laporan"
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
              <Label htmlFor="report-date-from">Dari Tanggal</Label>
              <Input
                id="report-date-from"
                type="date"
                className="h-11"
                value={pending.dateFrom}
                onChange={(event) => setPending((prev) => ({ ...prev, dateFrom: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="report-date-to">Sampai Tanggal</Label>
              <Input
                id="report-date-to"
                type="date"
                className="h-11"
                value={pending.dateTo}
                onChange={(event) => setPending((prev) => ({ ...prev, dateTo: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="report-owner-type">Pemilik</Label>
            <Select
              value={pending.ownerType || "ALL"}
              onValueChange={(value) => setPending((prev) => ({ ...prev, ownerType: value }))}
            >
              <SelectTrigger id="report-owner-type" className="h-11 w-full">
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

          <div className="grid gap-2">
            <Label htmlFor="report-channel">Channel</Label>
            <Select
              value={pending.channel || "ALL"}
              onValueChange={(value) => setPending((prev) => ({ ...prev, channel: value }))}
            >
              <SelectTrigger id="report-channel" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="report-type">Tipe Transaksi</Label>
            <Select
              value={pending.type || "ALL"}
              onValueChange={(value) => setPending((prev) => ({ ...prev, type: value }))}
            >
              <SelectTrigger id="report-type" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
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
