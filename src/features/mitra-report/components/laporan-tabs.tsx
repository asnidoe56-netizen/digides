import Link from "next/link";
import { cn } from "@/lib/utils";

export type LaporanTabKey = "transaksi" | "mutasi" | "rekap";

const TABS: Array<{ key: LaporanTabKey; label: string }> = [
  { key: "transaksi", label: "Transaksi" },
  { key: "mutasi", label: "Mutasi" },
  { key: "rekap", label: "Rekap" },
];

export interface LaporanTabsProps {
  active: LaporanTabKey;
  /** Preserves period/dateFrom/dateTo when switching tabs — only `tab`
   *  and `page` ever change here. */
  buildHref: (tab: LaporanTabKey) => string;
}

// Plain server-rendered links, not client-managed tabs — same "URL state"
// pattern as WalletTabs, so refreshing or sharing the link keeps whichever
// tab/period was selected.
export function LaporanTabs({ active, buildHref }: LaporanTabsProps) {
  return (
    <div className="print:hidden overflow-x-auto border-b">
      <nav className="flex w-max min-w-full gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={buildHref(tab.key)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
              active === tab.key
                ? "border-red-600 text-red-600"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
