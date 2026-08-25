import Link from "next/link";
import { cn } from "@/lib/utils";

export type ReferralTabKey = "codes" | "relationships";

const TABS: Array<{ key: ReferralTabKey; label: string }> = [
  { key: "codes", label: "Kode Referral" },
  { key: "relationships", label: "Relasi" },
];

export interface ReferralTabsProps {
  active: ReferralTabKey;
}

// Same URL-driven tab pattern as WalletTabs/CommissionTabs.
export function ReferralTabs({ active }: ReferralTabsProps) {
  return (
    <div className="overflow-x-auto border-b">
      <nav className="flex w-max min-w-full gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/super-admin/referrals?tab=${tab.key}`}
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
