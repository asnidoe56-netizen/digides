"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-config";
import type { RoleCode } from "@/types/user";

export interface DesktopSidebarNavProps {
  role: RoleCode;
  className?: string;
}

// Desktop navigation: a fixed-width sidebar with every menu item visible
// at once (issue M03 section 21). Paired with MobileBottomNav, which shows
// the same NAV_ITEMS list but in a thumb-reachable bottom bar instead.
export function DesktopSidebarNav({ role, className }: DesktopSidebarNavProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];

  return (
    <nav className={cn("w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r p-4", className)}>
      <div className="mb-4 px-2 text-lg font-semibold">DigiDes</div>
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
