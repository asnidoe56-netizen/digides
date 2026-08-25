import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { findActiveSessionContext, touchSessionActivity } from "@/repositories/user-session.repository";

// Session strategy: a signed, httpOnly cookie (payload + HMAC-SHA256
// signature) whose payload embeds a user_sessions row id. The signature
// check is stateless (no DB access), but every request still needs one DB
// round trip to confirm that specific session hasn't been revoked, hasn't
// idle-timed-out per the current security policy, and its device hasn't
// been blocked since the session was issued — see
// user-session.repository.ts's findActiveSessionContext(). This replaced
// a single global users.session_version counter (018_users_session_version.sql)
// because the Security module's "Sesi Login" tab needs to revoke one
// specific session without touching any other session of the same user,
// which a global counter can never do.

export const SESSION_COOKIE_NAME = "digides_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  roles: string[];
  sessionId: string;
  exp: number; // unix seconds
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createSessionToken(userId: string, roles: string[], sessionId: string): string {
  const payload: SessionPayload = {
    userId,
    roles,
    sessionId,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

// Verifies only the signature and expiry — a stateless check with no DB
// access, deliberately kept separate from the session-row check (which
// does need the DB) so callers that only care about "is this token
// well-formed and unexpired" aren't forced into a DB round-trip. Returns
// null for anything invalid, expired, or tampered with — callers treat
// null exactly like "no session", never as an error to surface.
export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString()) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (typeof payload.sessionId !== "string" || !payload.sessionId) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Reads and verifies the session cookie for the current request — usable
// from Server Components (page/layout guards) and Route Handlers (API
// authorization) alike, since both can call next/headers' cookies().
// Returns null for "not logged in", never throws for that case.
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const payload = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!payload) return null;

  const context = await findActiveSessionContext(payload.sessionId);
  if (!context) return null;

  // Blocking a device or lowering the idle-timeout policy takes effect on
  // the very next request, not just future logins.
  if (context.device_trust_status === "BLOCKED" || context.device_trust_status === "REVOKED") {
    return null;
  }
  const idleMinutes = (Date.now() - context.last_active_at.getTime()) / 60_000;
  if (idleMinutes > context.session_timeout_minutes) {
    return null;
  }

  await touchSessionActivity(payload.sessionId);

  return payload;
}

// Convenience for Route Handlers that only ever allow one role — the same
// "session missing or role missing -> 403" check every SUPER_ADMIN-only
// endpoint needs (digiflazz settings, users, wallet, ...). Returns null on
// any failure so the caller's existing `if (!session) return 403` shape
// still works without a separate error path to handle.
export async function requireRole(role: string): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || !session.roles.includes(role)) {
    return null;
  }
  return session;
}
