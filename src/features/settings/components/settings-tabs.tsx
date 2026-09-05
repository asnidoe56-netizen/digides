import Link from "next/link";
import { cn } from "@/lib/utils";

export type SettingsTabKey = "digiflazz" | "midtrans" | "manual-topup" | "support";

const TABS: Array<{ key: SettingsTabKey; label: string }> = [
  { key: "digiflazz", label: "Digiflazz" },
  { key: "midtrans", label: "Midtrans" },
  { key: "manual-topup", label: "Top Up Manual" },
  { key: "support", label: "Bantuan" },
];

export interface SettingsTabsProps {
  active: SettingsTabKey;
}

// Same URL-driven tab pattern as WalletTabs/CommissionTabs/ReferralTabs —
// each provider's credentials live on their own tab instead of one long
// stacked page, so an admin editing Midtrans never has to scroll past the
// entire Digiflazz form (and vice versa) to get there.
export function SettingsTabs({ active }: SettingsTabsProps) {
  return (
    <div className="overflow-x-auto border-b">
      <nav className="flex w-max min-w-full gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/super-admin/settings?tab=${tab.key}`}
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
