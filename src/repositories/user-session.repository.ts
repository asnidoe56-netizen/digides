import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { UserSession } from "@/types/security";

export interface CreateUserSessionInput {
  user_id: string;
  device_id: string;
  ip_address: string | null;
  user_agent: string;
  expires_at: Date;
}

export async function createUserSession(input: CreateUserSessionInput, db: Queryable = pool): Promise<UserSession> {
  const result = await db.query<UserSession>(
    `INSERT INTO user_sessions (user_id, device_id, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [input.user_id, input.device_id, input.ip_address, input.user_agent, input.expires_at],
  );
  return result.rows[0];
}

export interface ActiveSessionContext {
  id: string;
  last_active_at: Date;
  device_trust_status: string;
  session_timeout_minutes: number;
}

// The one query getSession() runs on every authenticated request: session
// row + its device's live trust status + the owning user's current
// account status + the current policy's idle-timeout threshold, in a
// single round trip. Blocking a device (trust_status), suspending/
// deleting the account (u.status), or tightening the policy all take
// effect on the very next request — no need to wait for anything to
// expire, and no need for every status-changing code path to remember to
// separately revoke sessions (security audit SEC-02).
export async function findActiveSessionContext(id: string, db: Queryable = pool): Promise<ActiveSessionContext | null> {
  const result = await db.query<ActiveSessionContext>(
    `SELECT s.id, s.last_active_at, d.trust_status AS device_trust_status, p.session_timeout_minutes
     FROM user_sessions s
     JOIN user_devices d ON d.id = s.device_id
     JOIN users u ON u.id = s.user_id
     CROSS JOIN security_policies p
     WHERE s.id = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND u.status = 'ACTIVE'`,
    [id],
  );
  return result.rows[0] ?? null;
}

// Best-effort, throttled (only writes if last_active_at is more than two
// minutes stale) so browsing the dashboard doesn't issue a write on every
// single request just to keep "last active" fresh.
export async function touchSessionActivity(id: string, db: Queryable = pool): Promise<void> {
  await db.query(
    `UPDATE user_sessions SET last_active_at = now() WHERE id = $1 AND last_active_at < now() - interval '2 minutes'`,
    [id],
  );
}

export async function revokeSession(id: string, reason: string, db: Queryable = pool): Promise<UserSession | null> {
  const result = await db.query<UserSession>(
    `UPDATE user_sessions SET revoked_at = now(), revoked_reason = $2
     WHERE id = $1 AND revoked_at IS NULL RETURNING *`,
    [id, reason],
  );
  return result.rows[0] ?? null;
}

export async function revokeAllSessionsForUser(
  userId: string,
  reason: string,
  db: Queryable = pool,
): Promise<number> {
  const result = await db.query(
    `UPDATE user_sessions SET revoked_at = now(), revoked_reason = $2
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId, reason],
  );
  return result.rowCount ?? 0;
}

// Ganti Password — signs the account out everywhere else without ending
// the session the mitra just used to change it, so the confirmation they
// see isn't immediately followed by their own screen logging them out.
export async function revokeAllOtherSessionsForUser(
  userId: string,
  exceptSessionId: string,
  reason: string,
  db: Queryable = pool,
): Promise<number> {
  const result = await db.query(
    `UPDATE user_sessions SET revoked_at = now(), revoked_reason = $3
     WHERE user_id = $1 AND id != $2 AND revoked_at IS NULL`,
    [userId, exceptSessionId, reason],
  );
  return result.rowCount ?? 0;
}

export async function revokeAllSessionsForDevice(
  deviceId: string,
  reason: string,
  db: Queryable = pool,
): Promise<number> {
  const result = await db.query(
    `UPDATE user_sessions SET revoked_at = now(), revoked_reason = $2
     WHERE device_id = $1 AND revoked_at IS NULL`,
    [deviceId, reason],
  );
  return result.rowCount ?? 0;
}

export async function findSessionById(id: string, db: Queryable = pool): Promise<UserSession | null> {
  const result = await db.query<UserSession>(`SELECT * FROM user_sessions WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export interface UserSessionWithDetail extends UserSession {
  owner_name: string;
  owner_email: string;
  device_name: string;
  platform: string;
}

export interface ListSessionsFilter {
  userId?: string;
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

function buildSessionFilterConditions(filter: ListSessionsFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter.userId) {
    params.push(filter.userId);
    conditions.push(`s.user_id = $${params.length}`);
  }
  if (filter.activeOnly) {
    conditions.push(`s.revoked_at IS NULL AND s.expires_at > now()`);
  }
  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

export async function listSessions(
  filter: ListSessionsFilter = {},
  db: Queryable = pool,
): Promise<UserSessionWithDetail[]> {
  const { where, params } = buildSessionFilterConditions(filter);
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<UserSessionWithDetail>(
    `SELECT s.*, u.full_name AS owner_name, u.email AS owner_email, d.device_name, d.platform
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     JOIN user_devices d ON d.id = s.device_id
     ${where}
     ORDER BY s.last_active_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countSessions(filter: ListSessionsFilter = {}, db: Queryable = pool): Promise<number> {
  const { where, params } = buildSessionFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     JOIN user_devices d ON d.id = s.device_id
     ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}
