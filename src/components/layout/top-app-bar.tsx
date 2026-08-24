import { cn } from "@/lib/utils";

export interface TopAppBarProps {
  className?: string;
}

// Mobile-only top bar (issue M03 section 21: "Mobile: Top App Bar +
// Bottom Navigation"). Desktop gets the sidebar instead — see
// DesktopSidebarNav — so this never renders past the `lg` breakpoint.
export function TopAppBar({ className }: TopAppBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 shrink-0 items-center border-b bg-background px-4",
        className,
      )}
    >
      <span className="text-base font-semibold">DigiDes</span>
    </header>
  );
}
