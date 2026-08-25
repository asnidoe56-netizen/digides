import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { LoginActivity, LoginActivityEventType } from "@/types/security";

export interface CreateLoginActivityInput {
  user_id: string | null;
  attempted_email: string;
  event_type: LoginActivityEventType;
  device_id?: string | null;
  ip_address: string | null;
  user_agent: string | null;
  detail?: string | null;
}

export async function recordLoginActivity(input: CreateLoginActivityInput, db: Queryable = pool): Promise<LoginActivity> {
  const result = await db.query<LoginActivity>(
    `INSERT INTO login_activities (user_id, attempted_email, event_type, device_id, ip_address, user_agent, detail)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      input.user_id,
      input.attempted_email,
      input.event_type,
      input.device_id ?? null,
      input.ip_address,
      input.user_agent,
      input.detail ?? null,
    ],
  );
  return result.rows[0];
}

// Brute-force detection window — counts LOGIN_FAILED rows for this email
// within the last `windowMinutes`, used against security_policies'
// max_login_attempts before locking the account.
export async function countRecentFailedLogins(
  email: string,
  windowMinutes: number,
  db: Queryable = pool,
): Promise<number> {
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM login_activities
     WHERE attempted_email = $1 AND event_type = 'LOGIN_FAILED' AND created_at > now() - ($2 || ' minutes')::interval`,
    [email, windowMinutes],
  );
  return Number(result.rows[0].count);
}

export interface ListLoginActivitiesFilter {
  eventType?: LoginActivityEventType;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

function buildLoginActivityFilterConditions(filter: ListLoginActivitiesFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter.eventType) {
    params.push(filter.eventType);
    conditions.push(`la.event_type = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    conditions.push(`la.attempted_email ILIKE $${params.length}`);
  }
  if (filter.dateFrom) {
    params.push(filter.dateFrom);
    conditions.push(`la.created_at >= $${params.length}`);
  }
  if (filter.dateTo) {
    params.push(filter.dateTo);
    conditions.push(`la.created_at <= $${params.length}`);
  }
  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

export interface LoginActivityWithDetail extends LoginActivity {
  owner_name: string | null;
  device_name: string | null;
}

export async function listLoginActivities(
  filter: ListLoginActivitiesFilter = {},
  db: Queryable = pool,
): Promise<LoginActivityWithDetail[]> {
  const { where, params } = buildLoginActivityFilterConditions(filter);
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<LoginActivityWithDetail>(
    `SELECT la.*, u.full_name AS owner_name, d.device_name
     FROM login_activities la
     LEFT JOIN users u ON u.id = la.user_id
     LEFT JOIN user_devices d ON d.id = la.device_id
     ${where}
     ORDER BY la.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countLoginActivities(
  filter: ListLoginActivitiesFilter = {},
  db: Queryable = pool,
): Promise<number> {
  const { where, params } = buildLoginActivityFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM login_activities la ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}
