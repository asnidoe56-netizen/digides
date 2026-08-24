import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// Session strategy: a signed, httpOnly cookie (payload + HMAC-SHA256
// signature), not a database-backed session table. PRD's own env spec
// already anticipates AUTH_SECRET for exactly this — no new migration/
// schema decision needed. The payload is small (user id + role codes +
// expiry) so nothing here requires a DB round-trip to validate a session.

export const SESSION_COOKIE_NAME = "digides_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  roles: string[];
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

export function createSessionToken(userId: string, roles: string[]): string {
  const payload: SessionPayload = {
    userId,
    roles,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

// Returns null for anything invalid, expired, or tampered with — callers
// treat null exactly like "no session", never as an error to surface.
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
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}
