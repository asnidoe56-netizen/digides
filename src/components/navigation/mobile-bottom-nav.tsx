"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MOBILE_PRIMARY_NAV_ITEMS, NAV_ITEMS } from "./nav-config";
import type { RoleCode } from "@/types/user";

export interface MobileBottomNavProps {
  role: RoleCode;
  className?: string;
}

// Mobile navigation: a fixed bottom bar with the 4 most-used items plus a
// "Lainnya" (More) sheet for everything else — never more than 5 touch
// targets in the bar itself, per issue M03 section 5 (thumb-reachable,
// large touch targets).
export function MobileBottomNav({ role, className }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const primaryItems = MOBILE_PRIMARY_NAV_ITEMS[role];
  const allItems = NAV_ITEMS[role];

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t bg-background",
        className,
      )}
    >
      {primaryItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-xs",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}

      <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
        <SheetTrigger
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground",
          )}
        >
          <Menu className="size-5" />
          Lainnya
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-3 p-4 pt-0">
            {allItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="flex flex-col items-center gap-2 rounded-lg border p-3 text-center text-xs"
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
