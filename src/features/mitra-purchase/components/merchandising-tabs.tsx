"use client";

import { cn } from "@/lib/utils";
import { MERCHANDISING_TABS, type MerchandisingFilter } from "../lib/merchandising-config";

export interface MerchandisingTabsProps {
  value: MerchandisingFilter;
  onChange: (value: MerchandisingFilter) => void;
}

// The Super Murah / Promo / Terlaris / Reguler filter row on the provider-
// browse screen — reads the same merchandising_tag Super Admin sets on the
// Produk page (product.service.ts's setProductTag), so tagging a product
// there is what makes it show up curated here instead of just in "Reguler".
export function MerchandisingTabs({ value, onChange }: MerchandisingTabsProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {MERCHANDISING_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border p-2 text-center",
              isActive ? tab.activeClassName : "border-border bg-background",
            )}
          >
            <span className={cn("flex size-8 items-center justify-center rounded-full", tab.iconClassName)}>
              <Icon className="size-4" />
            </span>
            <span className={cn("text-xs font-semibold", isActive ? tab.activeTextClassName : "text-foreground")}>
              {tab.label}
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground">{tab.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
