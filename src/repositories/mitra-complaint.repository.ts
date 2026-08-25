import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { MitraComplaint, MitraComplaintStatus } from "@/types/notification";

export interface CreateMitraComplaintInput {
  bumdes_id: string;
  subject: string;
  message: string;
}

export async function createMitraComplaint(
  input: CreateMitraComplaintInput,
  db: Queryable = pool,
): Promise<MitraComplaint> {
  const result = await db.query<MitraComplaint>(
    `INSERT INTO mitra_complaints (bumdes_id, subject, message) VALUES ($1, $2, $3) RETURNING *`,
    [input.bumdes_id, input.subject, input.message],
  );
  return result.rows[0];
}

export async function findMitraComplaintById(id: string, db: Queryable = pool): Promise<MitraComplaint | null> {
  const result = await db.query<MitraComplaint>(`SELECT * FROM mitra_complaints WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export interface MitraComplaintWithDetail extends MitraComplaint {
  mitra_name: string;
  agent_name: string | null;
}

export interface ListMitraComplaintsFilter {
  status?: MitraComplaintStatus;
  limit?: number;
  offset?: number;
}

function buildComplaintFilterConditions(filter: ListMitraComplaintsFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    params.push(filter.status);
    conditions.push(`mc.status = $${params.length}`);
  }
  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

// The Support menu's Tiket tab — every complaint with the Mitra's name
// and (if assigned) the handling agent's name, so the queue is readable
// without a separate lookup per row.
export async function listMitraComplaints(
  filter: ListMitraComplaintsFilter = {},
  db: Queryable = pool,
): Promise<MitraComplaintWithDetail[]> {
  const { where, params } = buildComplaintFilterConditions(filter);
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<MitraComplaintWithDetail>(
    `SELECT mc.*, b.name AS mitra_name, sa.full_name AS agent_name
     FROM mitra_complaints mc
     JOIN bumdes b ON b.id = mc.bumdes_id
     LEFT JOIN support_agents sa ON sa.id = mc.assigned_agent_id
     ${where}
     ORDER BY mc.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countMitraComplaints(
  filter: ListMitraComplaintsFilter = {},
  db: Queryable = pool,
): Promise<number> {
  const { where, params } = buildComplaintFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM mitra_complaints mc ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}

export async function assignMitraComplaint(
  id: string,
  agentId: string,
  db: Queryable = pool,
): Promise<MitraComplaint | null> {
  const result = await db.query<MitraComplaint>(
    `UPDATE mitra_complaints SET assigned_agent_id = $2 WHERE id = $1 RETURNING *`,
    [id, agentId],
  );
  return result.rows[0] ?? null;
}

export async function resolveMitraComplaint(
  id: string,
  resolutionNote: string,
  db: Queryable = pool,
): Promise<MitraComplaint | null> {
  const result = await db.query<MitraComplaint>(
    `UPDATE mitra_complaints
     SET status = 'RESOLVED', resolved_at = now(), resolution_note = $2
     WHERE id = $1 AND status = 'OPEN'
     RETURNING *`,
    [id, resolutionNote],
  );
  return result.rows[0] ?? null;
}
