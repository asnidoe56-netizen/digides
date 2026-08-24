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
//
// Scroll architecture (global — every page under this shell gets this for
// free, not just Products): the shell is bounded to exactly the viewport
// height (`h-dvh`, the dynamic viewport unit so a mobile browser's
// address bar showing/hiding doesn't cause jumps) with `overflow-hidden`,
// so it can never grow taller than the screen and hand scrolling off to
// <body>. Inside that fixed-height box, only <main> gets `overflow-y-auto`
// — it is the one and only scroll container. The sidebar and top/bottom
// nav are siblings of that scroll container, not descendants of it, so
// they never move when page content scrolls; `min-h-0` on every flex
// parent in the chain is what lets <main> actually shrink to fit and
// activate its own scrollbar instead of being pushed taller by content
// (the same category of flexbox default as the min-w-0 fix products
// needed for its table).
export function AppShell({ role, children }: AppShellProps) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background lg:flex-row">
      <DesktopSidebarNav role={role} className="hidden lg:flex" />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopAppBar className="lg:hidden" />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 pb-20 sm:p-6 lg:pb-6">
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
