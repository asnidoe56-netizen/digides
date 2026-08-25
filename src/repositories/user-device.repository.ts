import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { DeviceTrustStatus, UserDevice } from "@/types/security";

export interface CreateUserDeviceInput {
  user_id: string;
  fingerprint: string;
  device_name: string;
  platform: string;
  browser: string;
  user_agent: string;
  last_ip: string | null;
  trust_status: DeviceTrustStatus;
}

export async function createUserDevice(input: CreateUserDeviceInput, db: Queryable = pool): Promise<UserDevice> {
  const result = await db.query<UserDevice>(
    `INSERT INTO user_devices (user_id, fingerprint, device_name, platform, browser, user_agent, last_ip, trust_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      input.user_id,
      input.fingerprint,
      input.device_name,
      input.platform,
      input.browser,
      input.user_agent,
      input.last_ip,
      input.trust_status,
    ],
  );
  return result.rows[0];
}

export async function findDeviceByFingerprint(
  userId: string,
  fingerprint: string,
  db: Queryable = pool,
): Promise<UserDevice | null> {
  const result = await db.query<UserDevice>(
    `SELECT * FROM user_devices WHERE user_id = $1 AND fingerprint = $2`,
    [userId, fingerprint],
  );
  return result.rows[0] ?? null;
}

export async function findDeviceById(id: string, db: Queryable = pool): Promise<UserDevice | null> {
  const result = await db.query<UserDevice>(`SELECT * FROM user_devices WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function countActiveDevicesForUser(userId: string, db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM user_devices WHERE user_id = $1 AND trust_status IN ('TRUSTED', 'PENDING')`,
    [userId],
  );
  return Number(result.rows[0].count);
}

export async function touchDevice(
  id: string,
  lastIp: string | null,
  db: Queryable = pool,
): Promise<void> {
  await db.query(`UPDATE user_devices SET last_ip = $2, last_seen_at = now() WHERE id = $1`, [id, lastIp]);
}

export async function setDeviceTrustStatus(
  id: string,
  status: DeviceTrustStatus,
  db: Queryable = pool,
): Promise<UserDevice | null> {
  const result = await db.query<UserDevice>(
    `UPDATE user_devices SET trust_status = $2 WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return result.rows[0] ?? null;
}

export interface UserDeviceWithOwner extends UserDevice {
  owner_name: string;
  owner_email: string;
  active_session_count: number;
}

export interface ListDevicesFilter {
  trustStatus?: DeviceTrustStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

function buildDeviceFilterConditions(filter: ListDevicesFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter.trustStatus) {
    params.push(filter.trustStatus);
    conditions.push(`d.trust_status = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

// Every device across every user — the Security module is an admin-wide
// view (Super Admin monitors everyone's access), not a "my devices" panel.
export async function listDevices(
  filter: ListDevicesFilter = {},
  db: Queryable = pool,
): Promise<UserDeviceWithOwner[]> {
  const { where, params } = buildDeviceFilterConditions(filter);
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<UserDeviceWithOwner>(
    `SELECT d.*, u.full_name AS owner_name, u.email AS owner_email,
            (SELECT COUNT(*) FROM user_sessions s
             WHERE s.device_id = d.id AND s.revoked_at IS NULL AND s.expires_at > now())::int AS active_session_count
     FROM user_devices d
     JOIN users u ON u.id = d.user_id
     ${where}
     ORDER BY d.last_seen_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countDevices(filter: ListDevicesFilter = {}, db: Queryable = pool): Promise<number> {
  const { where, params } = buildDeviceFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM user_devices d JOIN users u ON u.id = d.user_id ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}
