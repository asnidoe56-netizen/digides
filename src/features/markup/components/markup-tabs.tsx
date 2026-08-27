import Link from "next/link";
import { cn } from "@/lib/utils";

export type MarkupTabKey = "kategori" | "produk";

const TABS: Array<{ key: MarkupTabKey; label: string }> = [
  { key: "kategori", label: "Kategori" },
  { key: "produk", label: "Per Produk" },
];

export interface MarkupTabsProps {
  active: MarkupTabKey;
}

// Same URL-driven tab pattern as SettingsTabs/WalletTabs — "Kategori"
// keeps the original flat per-category markup, "Per Produk" is the new
// per-item/per-provider override view.
export function MarkupTabs({ active }: MarkupTabsProps) {
  return (
    <div className="overflow-x-auto border-b">
      <nav className="flex w-max min-w-full gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/super-admin/markup?tab=${tab.key}`}
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
