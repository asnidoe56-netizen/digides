"use client";

import type { ReactNode } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onReset: () => void;
  onApply: () => void;
  children: ReactNode;
}

// Below "Tablet" (issue M03 planning doc: sm = 640px is where mobile
// ends) this renders a bottom Sheet; at 640px and up it renders a
// centered Dialog instead — a bottom sheet edge-to-edge on a tablet or
// desktop screen looks and behaves wrong.
const TABLET_UP_QUERY = "(min-width: 640px)";

// Generic responsive filter shell — mobile bottom sheet vs tablet/desktop
// dialog, both with a fixed header, an internally-scrollable field area,
// and a fixed Reset/Terapkan footer (safe-area aware on the sheet).
// Feature filter components (e.g. ProductFilterDialog, UserFilterDialog)
// own the actual field values and pass them in as `children`; this shell
// only knows about open/close and the two action buttons — extracted here
// after the same Sheet/Dialog-switch logic was needed a second time (see
// issue M03 section 36: "jika pola UI dipakai 2-3 kali, pertimbangkan
// shared component").
export function FilterSheet({ open, onOpenChange, title, onReset, onApply, children }: FilterSheetProps) {
  const isTabletUp = useMediaQuery(TABLET_UP_QUERY);

  if (isTabletUp) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">{children}</div>

          <DialogFooter className="flex-row gap-3 sm:justify-stretch">
            <Button type="button" variant="outline" onClick={onReset} className="h-11 flex-1">
              Reset
            </Button>
            <Button type="button" onClick={onApply} className="h-11 flex-1">
              Terapkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-0 p-0">
        <SheetHeader className="shrink-0 border-b">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        <SheetFooter
          className="shrink-0 flex-row border-t"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <Button type="button" variant="outline" onClick={onReset} className="h-11 flex-1">
            Reset
          </Button>
          <Button type="button" onClick={onApply} className="h-11 flex-1">
            Terapkan
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
