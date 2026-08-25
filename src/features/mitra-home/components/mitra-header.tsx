"use client";

import { Menu } from "lucide-react";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { NotificationBell } from "@/features/notification";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface MitraHeaderProps {
  fullName: string;
  roleLabel: string;
}

export function MitraHeader({ fullName, roleLabel }: MitraHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Sheet>
        <SheetTrigger
          aria-label="Menu"
          className="flex size-9 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
        >
          <Menu className="size-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>{fullName}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 p-4 pt-0">
            <p className="mb-2 text-sm text-muted-foreground">{roleLabel}</p>
            <LogoutButton />
          </div>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1 text-white">
        <p className="text-xs text-white/80">Selamat datang,</p>
        <p className="truncate text-sm font-semibold">
          {fullName} <span className="font-normal text-white/80">({roleLabel})</span>
        </p>
      </div>

      {/* NotificationBell has no theming props, so its toggle button is
          re-colored for this red header via a precise attribute selector
          (its aria-label) — narrow enough that it can't leak into the
          dropdown panel's own buttons, which must keep their normal
          light-background styling. */}
      <div className='[&_button[aria-label="Notifikasi"]]:text-white [&_button[aria-label="Notifikasi"]:hover]:bg-white/10'>
        <NotificationBell />
      </div>
    </div>
  );
}
