import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { recordLoginActivity } from "@/repositories/login-activity.repository";
import { findUserById } from "@/repositories/user.repository";
import { revokeSession } from "@/repositories/user-session.repository";

// Revokes only this one session row — logging out on one device must
// never end another device's session. "Log out everywhere" is a distinct,
// explicit action from the Security module's Sesi Login tab
// (revokeAllSessionsForUser in security.service.ts), not something a
// normal logout does implicitly.
export async function POST() {
  const session = await getSession();

  if (session) {
    await revokeSession(session.sessionId, "USER_LOGOUT");
    const user = await findUserById(session.userId);
    await recordLoginActivity({
      user_id: session.userId,
      attempted_email: user?.email ?? "",
      event_type: "LOGOUT",
      ip_address: null,
      user_agent: null,
    });
    await recordAuditLog({
      actor_user_id: session.userId,
      action: "USER_LOGGED_OUT",
      entity: "users",
      entity_id: session.userId,
    });
  }

  const response = NextResponse.json({ success: true });

  // Same attributes login used to set it — path must match exactly or
  // some browsers silently keep the old cookie around instead of
  // overwriting it.
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
