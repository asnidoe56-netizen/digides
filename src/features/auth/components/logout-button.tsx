"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LogoutButtonProps {
  className?: string;
  /** Icon-only, for tight spaces like the mobile TopAppBar. */
  iconOnly?: boolean;
}

// Always a hard navigation (window.location, never router.push) on
// success — a client-side route change would leave the just-logged-out
// page's React state (and Next's Router Cache) sitting in memory. A full
// reload guarantees nothing from the authenticated session lingers in the
// browser tab, and the fresh request to /login can't be served a cached
// authenticated response either (every dashboard page here already sets
// dynamic = "force-dynamic").
export function LogoutButton({ className, iconOnly = false }: LogoutButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        aria-label="Keluar"
        className={cn(
          "flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
          className,
        )}
      >
        <LogOut className="size-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
        className,
      )}
    >
      <LogOut className="size-4 shrink-0" />
      {isLoggingOut ? "Keluar..." : "Keluar"}
    </button>
  );
}
