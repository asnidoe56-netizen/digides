import Link from "next/link";
import { cn } from "@/lib/utils";

export type WalletTabKey = "overview" | "accounts" | "mutasi" | "topup" | "ledger";

const TABS: Array<{ key: WalletTabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "accounts", label: "Wallet Accounts" },
  { key: "mutasi", label: "Mutasi" },
  { key: "topup", label: "Top Up" },
  { key: "ledger", label: "Ledger" },
];

export interface WalletTabsProps {
  active: WalletTabKey;
}

// Plain server-rendered links, not client-managed Radix Tabs — the active
// tab lives in the URL (?tab=accounts) so each tab keeps its own filter/
// pagination state on refresh and is shareable, matching every other list
// page's "URL state" pattern in this app. Scrolls horizontally instead of
// wrapping so it never breaks the layout on a narrow phone.
export function WalletTabs({ active }: WalletTabsProps) {
  return (
    <div className="overflow-x-auto border-b">
      <nav className="flex w-max min-w-full gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/super-admin/wallets?tab=${tab.key}`}
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
              active === tab.key
                ? "border-primary text-foreground"
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
