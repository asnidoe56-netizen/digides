"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "Semua Kategori" },
  { value: "MATCH", label: "Cocok" },
  { value: "STATUS_MISMATCH", label: "Status Tidak Cocok" },
  { value: "AMOUNT_MISMATCH", label: "Nominal Tidak Cocok" },
  { value: "LOCAL_ONLY", label: "Hanya Lokal" },
  { value: "PROVIDER_ONLY", label: "Hanya Provider" },
  { value: "NEED_REVIEW", label: "Perlu Ditinjau" },
];

const RESOLVED_OPTIONS = [
  { value: "ALL", label: "Semua" },
  { value: "false", label: "Belum Selesai" },
  { value: "true", label: "Sudah Selesai" },
];

export function ReconciliationFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={searchParams.get("category") ?? "ALL"} onValueChange={(value) => updateParam("category", value)}>
        <SelectTrigger className="h-11 w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CATEGORY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("resolved") ?? "ALL"}
        onValueChange={(value) => updateParam("resolved", value)}
      >
        <SelectTrigger className="h-11 w-full sm:w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RESOLVED_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
