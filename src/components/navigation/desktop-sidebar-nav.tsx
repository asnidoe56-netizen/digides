"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { NAV_ITEMS } from "./nav-config";
import type { RoleCode, UserSummary } from "@/types/user";

export interface DesktopSidebarNavProps {
  role: RoleCode;
  user: UserSummary;
  className?: string;
}

// Desktop navigation: a fixed-width sidebar with every menu item visible
// at once (issue M03 section 21). Paired with MobileBottomNav, which shows
// the same NAV_ITEMS list but in a thumb-reachable bottom bar instead.
export function DesktopSidebarNav({ role, user, className }: DesktopSidebarNavProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];

  return (
    // h-full: stretches to the AppShell's viewport-bounded height (its
    // flex row parent). overflow-y-auto here is this sidebar's OWN
    // internal scroll (for when the menu is longer than the viewport) —
    // separate from and independent of <main>'s scroll in AppShell.
    <nav className={cn("flex h-full w-64 shrink-0 flex-col border-r", className)}>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4">
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
      </div>

      <div className="shrink-0 border-t p-4">
        <div className="mb-2 min-w-0 px-3">
          <p className="truncate text-sm font-medium">{user.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <LogoutButton className="w-full" />
      </div>
    </nav>
  );
}
