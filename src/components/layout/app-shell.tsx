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

      <div className="flex min-h-screen flex-1 flex-col">
        <TopAppBar className="lg:hidden" />

        <main className="flex-1 p-4 pb-20 sm:p-6 lg:pb-6">{children}</main>

        <MobileBottomNav role={role} className="lg:hidden" />
      </div>
    </div>
  );
}
