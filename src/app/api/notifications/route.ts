import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getNotifications } from "@/services/notification.service";
import type { RoleCode } from "@/types/user";

// Fetched on-demand when the bell panel is opened, never polled — only
// the unread count (a much cheaper query) is polled. See
// notifications/unread-count/route.ts.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const notifications = await getNotifications(session.roles[0] as RoleCode);
  return NextResponse.json({ notifications });
}
