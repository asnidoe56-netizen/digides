import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/services/notification.service";
import type { RoleCode } from "@/types/user";

// The one endpoint the bell polls on an interval — deliberately just a
// COUNT(*) against an index (notifications_recipient_idx), never the
// full notification list, so polling this stays cheap regardless of how
// large the notifications table grows. Any authenticated role can poll
// its own feed — the bell is shared across Super Admin, BUMDes, and
// Konter dashboards, each scoped to their own recipient_role.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const count = await getUnreadNotificationCount(session.roles[0] as RoleCode);
  return NextResponse.json({ count });
}
