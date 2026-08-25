import Link from "next/link";
import { cn } from "@/lib/utils";

export type CommissionTabKey = "rules" | "ledger" | "payouts";

const TABS: Array<{ key: CommissionTabKey; label: string }> = [
  { key: "rules", label: "Aturan" },
  { key: "ledger", label: "Ledger" },
  { key: "payouts", label: "Payout" },
];

export interface CommissionTabsProps {
  active: CommissionTabKey;
}

// Same URL-driven tab pattern as WalletTabs — active tab lives in
// ?tab=, not client state, so filters/pagination survive a refresh.
export function CommissionTabs({ active }: CommissionTabsProps) {
  return (
    <div className="overflow-x-auto border-b">
      <nav className="flex w-max min-w-full gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/super-admin/commissions?tab=${tab.key}`}
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
