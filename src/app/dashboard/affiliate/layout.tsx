import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { getSession } from "@/lib/auth/session";

// AFFILIATE ("User Biasa") only has one page today — Menu Mitra (their
// referral code, downline, and reward status). There's no Beranda/
// Laporan/Akun to justify MitraBottomNav's four-tab bar (bumdes/konter's
// shell) yet, so this is a plain header + content shell instead of a nav
// pointing at pages that don't exist.
export default async function AffiliateLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session || !session.roles.includes("AFFILIATE")) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-background">
      <header className="flex items-center justify-between border-b p-4">
        <span className="text-sm font-semibold">DigiDes</span>
        <LogoutButton />
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
