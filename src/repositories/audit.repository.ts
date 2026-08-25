import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { AuditLog, CreateAuditLogInput } from "@/types/audit";

// Fields that must never reach old_value/new_value, regardless of what a
// service passes in — the single place this rule is enforced, so no
// individual call site has to remember it. Extend this list if a future
// table adds another credential-shaped column.
const SENSITIVE_KEYS = ["pin_hash", "password_hash", "dev_key_encrypted", "prod_key_encrypted"];

function redact(value: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  const clone = { ...value };
  for (const key of SENSITIVE_KEYS) {
    if (key in clone) {
      delete clone[key];
    }
  }
  return clone;
}

export async function recordAuditLog(
  input: CreateAuditLogInput,
  db: Queryable = pool,
): Promise<AuditLog> {
  const oldValue = redact(input.old_value ?? null);
  const newValue = redact(input.new_value ?? null);

  const result = await db.query<AuditLog>(
    `INSERT INTO audit_logs (actor_user_id, action, entity, entity_id, old_value, new_value, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.actor_user_id,
      input.action,
      input.entity,
      input.entity_id,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      input.ip_address ?? null,
      input.user_agent ?? null,
    ],
  );
  return result.rows[0];
}

// Platform-wide activity feed for the Super Admin dashboard — every other
// list* function here is scoped to one entity or actor.
export async function listRecentAuditLogs(limit = 10, db: Queryable = pool): Promise<AuditLog[]> {
  const result = await db.query<AuditLog>(
    `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function listAuditLogsForEntity(
  entity: string,
  entityId: string,
  limit = 100,
  db: Queryable = pool,
): Promise<AuditLog[]> {
  const result = await db.query<AuditLog>(
    `SELECT * FROM audit_logs WHERE entity = $1 AND entity_id = $2 ORDER BY created_at DESC LIMIT $3`,
    [entity, entityId, limit],
  );
  return result.rows;
}

export async function listAuditLogsForActor(
  actorUserId: string,
  limit = 100,
  db: Queryable = pool,
): Promise<AuditLog[]> {
  const result = await db.query<AuditLog>(
    `SELECT * FROM audit_logs WHERE actor_user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [actorUserId, limit],
  );
  return result.rows;
}

export interface AuditLogWithActor extends AuditLog {
  actor_name: string | null;
  actor_email: string | null;
}

export interface ListAuditLogsFilter {
  entity?: string;
  /** Matches actor name or email, case-insensitive. */
  actorSearch?: string;
  /** Matches the action string, case-insensitive. */
  actionSearch?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

function buildAuditLogFilterConditions(filter: ListAuditLogsFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.entity) {
    params.push(filter.entity);
    conditions.push(`al.entity = $${params.length}`);
  }
  if (filter.actorSearch) {
    params.push(`%${filter.actorSearch}%`);
    conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (filter.actionSearch) {
    params.push(`%${filter.actionSearch}%`);
    conditions.push(`al.action ILIKE $${params.length}`);
  }
  if (filter.dateFrom) {
    params.push(filter.dateFrom);
    conditions.push(`al.created_at >= $${params.length}`);
  }
  if (filter.dateTo) {
    params.push(filter.dateTo);
    conditions.push(`al.created_at <= $${params.length}`);
  }

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

// The Audit Log menu's platform-wide, filterable feed — every other list*
// above is scoped to one entity/actor already, this is the general one.
export async function listAuditLogsFiltered(
  filter: ListAuditLogsFilter = {},
  db: Queryable = pool,
): Promise<AuditLogWithActor[]> {
  const { where, params } = buildAuditLogFilterConditions(filter);
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<AuditLogWithActor>(
    `SELECT al.*, u.full_name AS actor_name, u.email AS actor_email
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_user_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countAuditLogsFiltered(
  filter: ListAuditLogsFilter = {},
  db: Queryable = pool,
): Promise<number> {
  const { where, params } = buildAuditLogFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM audit_logs al LEFT JOIN users u ON u.id = al.actor_user_id ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}

// Populates the Audit Log menu's entity filter dropdown from whatever
// entity strings actually exist — no hardcoded list to keep in sync as
// new features add new `entity` values.
export async function listDistinctAuditEntities(db: Queryable = pool): Promise<string[]> {
  const result = await db.query<{ entity: string }>(`SELECT DISTINCT entity FROM audit_logs ORDER BY entity`);
  return result.rows.map((row) => row.entity);
}
