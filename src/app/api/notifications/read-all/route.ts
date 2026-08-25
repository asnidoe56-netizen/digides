import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readAllNotifications } from "@/services/notification.service";
import type { RoleCode } from "@/types/user";

export async function PATCH() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const count = await readAllNotifications(session.roles[0] as RoleCode);
  return NextResponse.json({ count });
}
