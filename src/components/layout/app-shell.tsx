import type { ReactNode } from "react";
import { DesktopSidebarNav } from "@/components/navigation/desktop-sidebar-nav";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { TopAppBar } from "@/components/layout/top-app-bar";
import type { RoleCode } from "@/types/user";

export interface AppShellProps {
  role: RoleCode;
  children: ReactNode;
}

// The one layout every authenticated page renders inside. Desktop gets a
// sidebar (`lg:flex`); mobile gets a top bar + fixed bottom nav instead —
// same NAV_ITEMS config, two presentations, never two different shells to
// keep in sync (issue M03 section 4-5, 21).
export function AppShell({ role, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <DesktopSidebarNav role={role} className="hidden lg:flex" />

      {/* min-w-0 is load-bearing: a flex item defaults to min-width:auto,
          which refuses to shrink below its content's intrinsic width —
          that's what was letting a wide table push this column (and the
          whole page) into horizontal overflow instead of activating the
          table wrapper's own overflow-x-auto. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopAppBar className="lg:hidden" />

        <main className="min-w-0 flex-1 p-4 pb-20 sm:p-6 lg:pb-6">
          {/* Caps line/content length on very large monitors — an
              unconstrained page just stretches edge-to-edge on a wide
              screen, which reads as unfinished, not "responsive". */}
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>

        <MobileBottomNav role={role} className="lg:hidden" />
      </div>
    </div>
  );
}
