import Link from "next/link";
import { cn } from "@/lib/utils";

export type SupportTabKey = "tickets" | "team";

const TABS: Array<{ key: SupportTabKey; label: string }> = [
  { key: "tickets", label: "Tiket" },
  { key: "team", label: "Tim Support" },
];

export interface SupportTabsProps {
  active: SupportTabKey;
}

// Same URL-driven tab pattern as every other multi-section menu this
// session (Wallet, Commission, Referral, Settings).
export function SupportTabs({ active }: SupportTabsProps) {
  return (
    <div className="overflow-x-auto border-b">
      <nav className="flex w-max min-w-full gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/super-admin/support?tab=${tab.key}`}
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
