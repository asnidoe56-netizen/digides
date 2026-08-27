import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { MitraBottomNav } from "@/features/mitra-home";
import { getSession } from "@/lib/auth/session";

// Real authorization check for every page under dashboard/konter/* — the
// mobile bottom nav only decides what's shown, never what's allowed
// (same rule as the Super Admin layout).
//
// The nav is rendered once, here, as a global/shared shell — every page
// under this layout (Beranda, Pulsa, and whatever follows) gets it for
// free instead of each page rendering its own copy. It's `fixed`, so it
// never moves when a page's own content scrolls; `pb-16` on the content
// wrapper (exactly the nav's own h-16) is what keeps that content from
// ever rendering underneath it.
export default async function KonterLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session || !session.roles.includes("KONTER")) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-background">
      <div className="flex flex-1 flex-col pb-16">{children}</div>
      <MitraBottomNav
        homeHref="/dashboard/konter/dashboard"
        mitraHref="/dashboard/konter/mitra"
        akunHref="/dashboard/konter/akun"
      />
    </div>
  );
}
