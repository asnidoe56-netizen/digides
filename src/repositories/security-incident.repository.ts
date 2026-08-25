import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type {
  SecurityIncident,
  SecurityIncidentSeverity,
  SecurityIncidentStatus,
  SecurityIncidentType,
} from "@/types/security";

export interface CreateSecurityIncidentInput {
  type: SecurityIncidentType;
  severity: SecurityIncidentSeverity;
  user_id: string | null;
  device_id?: string | null;
  description: string;
}

export async function createSecurityIncident(
  input: CreateSecurityIncidentInput,
  db: Queryable = pool,
): Promise<SecurityIncident> {
  const result = await db.query<SecurityIncident>(
    `INSERT INTO security_incidents (type, severity, user_id, device_id, description)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [input.type, input.severity, input.user_id, input.device_id ?? null, input.description],
  );
  return result.rows[0];
}

export async function findSecurityIncidentById(id: string, db: Queryable = pool): Promise<SecurityIncident | null> {
  const result = await db.query<SecurityIncident>(`SELECT * FROM security_incidents WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function setSecurityIncidentStatus(
  id: string,
  status: SecurityIncidentStatus,
  actorUserId: string,
  resolutionNote: string | null,
  db: Queryable = pool,
): Promise<SecurityIncident | null> {
  const isTerminal = status === "RESOLVED" || status === "DISMISSED";
  const result = await db.query<SecurityIncident>(
    `UPDATE security_incidents
     SET status = $2,
         resolved_at = CASE WHEN $3 THEN now() ELSE resolved_at END,
         resolved_by = CASE WHEN $3 THEN $4 ELSE resolved_by END,
         resolution_note = CASE WHEN $3 THEN $5 ELSE resolution_note END
     WHERE id = $1 AND status IN ('OPEN', 'INVESTIGATING')
     RETURNING *`,
    [id, status, isTerminal, actorUserId, resolutionNote],
  );
  return result.rows[0] ?? null;
}

export interface SecurityIncidentWithDetail extends SecurityIncident {
  owner_name: string | null;
  device_name: string | null;
}

export interface ListSecurityIncidentsFilter {
  status?: SecurityIncidentStatus;
  limit?: number;
  offset?: number;
}

function buildIncidentFilterConditions(filter: ListSecurityIncidentsFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    params.push(filter.status);
    conditions.push(`si.status = $${params.length}`);
  }
  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

export async function listSecurityIncidents(
  filter: ListSecurityIncidentsFilter = {},
  db: Queryable = pool,
): Promise<SecurityIncidentWithDetail[]> {
  const { where, params } = buildIncidentFilterConditions(filter);
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<SecurityIncidentWithDetail>(
    `SELECT si.*, u.full_name AS owner_name, d.device_name
     FROM security_incidents si
     LEFT JOIN users u ON u.id = si.user_id
     LEFT JOIN user_devices d ON d.id = si.device_id
     ${where}
     ORDER BY si.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countSecurityIncidents(
  filter: ListSecurityIncidentsFilter = {},
  db: Queryable = pool,
): Promise<number> {
  const { where, params } = buildIncidentFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM security_incidents si ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}
