import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

// Role is fixed to SUPER_ADMIN by virtue of being under this route segment.
// Once session/auth exists (M03.3), this becomes: read the role from the
// session and redirect out if it isn't SUPER_ADMIN — the URL segment is a
// convenience today, not the authorization check.
export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <AppShell role="SUPER_ADMIN">{children}</AppShell>;
}
