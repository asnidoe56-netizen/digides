import { cn } from "@/lib/utils";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { NotificationBell } from "@/features/notification";
import type { UserSummary } from "@/types/user";

export interface TopAppBarProps {
  user: UserSummary;
  className?: string;
}

// Renders on every breakpoint (not just mobile) so the notification bell
// sits in the top-right corner everywhere, as issue requires. On mobile
// it also carries the "DigiDes" brand + user name + a logout icon — on
// desktop those already live in DesktopSidebarNav's own footer, so this
// bar shrinks down to just the bell there instead of duplicating them.
export function TopAppBar({ user, className }: TopAppBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b bg-background px-4",
        className,
      )}
    >
      <div className="min-w-0 lg:hidden">
        <span className="text-base font-semibold">DigiDes</span>
        <p className="truncate text-xs text-muted-foreground">{user.full_name}</p>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <LogoutButton iconOnly className="lg:hidden" />
      </div>
    </header>
  );
}
