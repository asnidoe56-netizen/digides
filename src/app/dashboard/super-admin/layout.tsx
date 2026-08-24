import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getSession } from "@/lib/auth/session";

// Every page under dashboard/super-admin/* renders inside this layout, so
// checking the session here protects all of them at once — including
// pages like Settings that hold provider credentials. This is the real
// authorization check; NAV_ITEMS only deciding what to *show* in the menu
// is not (issue M03 section 22).
export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    redirect("/login");
  }

  return <AppShell role="SUPER_ADMIN">{children}</AppShell>;
}
