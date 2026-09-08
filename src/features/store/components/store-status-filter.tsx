import Link from "next/link";
import { cn } from "@/lib/utils";
import type { StoreStatus } from "@/types/store";

const FILTERS: Array<{ label: string; value: StoreStatus | "ALL" }> = [
  { label: "Menunggu Verifikasi", value: "SUBMITTED" },
  { label: "Aktif", value: "ACTIVE" },
  { label: "Ditangguhkan", value: "SUSPENDED" },
  { label: "Semua", value: "ALL" },
];

export interface StoreStatusFilterProps {
  /** Undefined means no status filter is applied (the "Semua" tab). */
  current?: StoreStatus;
  /** How many stores are waiting — shown on the tab that matters most. */
  pendingCount: number;
}

// Plain links rather than a client-side control: the page already reads
// its filter from searchParams on the server, so this needs no JavaScript
// at all and keeps the filter shareable/bookmarkable as a URL.
export function StoreStatusFilter({ current, pendingCount }: StoreStatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const isActive = filter.value === "ALL" ? current === undefined : current === filter.value;
        const href =
          filter.value === "ALL"
            ? "/dashboard/super-admin/toko"
            : `/dashboard/super-admin/toko?status=${filter.value}`;

        return (
          <Link
            key={filter.value}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium",
              isActive ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {filter.label}
            {filter.value === "SUBMITTED" && pendingCount > 0 ? (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                  isActive
                    ? "bg-primary-foreground text-primary"
                    : "bg-status-pending text-status-pending-foreground",
                )}
              >
                {pendingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
