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
