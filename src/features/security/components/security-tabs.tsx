import Link from "next/link";
import { cn } from "@/lib/utils";

export type SecurityTabKey = "devices" | "sessions" | "activities" | "device-security" | "policy" | "incidents";

const TABS: Array<{ key: SecurityTabKey; label: string }> = [
  { key: "devices", label: "Perangkat Aktif" },
  { key: "sessions", label: "Sesi Login" },
  { key: "activities", label: "Aktivitas Login" },
  { key: "device-security", label: "Keamanan Perangkat" },
  { key: "policy", label: "Kebijakan Keamanan" },
  { key: "incidents", label: "Insiden Keamanan" },
];

export interface SecurityTabsProps {
  active: SecurityTabKey;
}

// Same URL-driven tab pattern as every other multi-section menu this
// session (Wallet, Commission, Referral, Settings, Support).
export function SecurityTabs({ active }: SecurityTabsProps) {
  return (
    <div className="overflow-x-auto border-b">
      <nav className="flex w-max min-w-full gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/super-admin/security?tab=${tab.key}`}
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
