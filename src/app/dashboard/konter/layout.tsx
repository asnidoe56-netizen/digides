import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

// Real authorization check for every page under dashboard/konter/* — the
// mobile bottom nav (rendered per top-level tab page, not here — see
// mitra-home-view.tsx) only decides what's shown, never what's allowed
// (same rule as the Super Admin layout). Drill-down flows like Pulsa are
// full-screen with their own header and intentionally have no bottom nav,
// matching the reference design.
export default async function KonterLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session || !session.roles.includes("KONTER")) {
    redirect("/login");
  }

  return <div className="mx-auto min-h-dvh max-w-lg bg-background">{children}</div>;
}
