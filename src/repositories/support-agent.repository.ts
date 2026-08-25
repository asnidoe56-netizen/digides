import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { SupportAgent, SupportAgentRole, SupportAgentStatus } from "@/types/support";

export interface CreateSupportAgentInput {
  full_name: string;
  email: string;
  phone?: string | null;
  role: SupportAgentRole;
}

export async function createSupportAgent(
  input: CreateSupportAgentInput,
  db: Queryable = pool,
): Promise<SupportAgent> {
  const result = await db.query<SupportAgent>(
    `INSERT INTO support_agents (full_name, email, phone, role) VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.full_name, input.email, input.phone ?? null, input.role],
  );
  return result.rows[0];
}

export async function findSupportAgentById(id: string, db: Queryable = pool): Promise<SupportAgent | null> {
  const result = await db.query<SupportAgent>(`SELECT * FROM support_agents WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export interface UpdateSupportAgentInput {
  full_name: string;
  email: string;
  phone?: string | null;
  role: SupportAgentRole;
}

export async function updateSupportAgent(
  id: string,
  input: UpdateSupportAgentInput,
  db: Queryable = pool,
): Promise<SupportAgent | null> {
  const result = await db.query<SupportAgent>(
    `UPDATE support_agents SET full_name = $2, email = $3, phone = $4, role = $5 WHERE id = $1 RETURNING *`,
    [id, input.full_name, input.email, input.phone ?? null, input.role],
  );
  return result.rows[0] ?? null;
}

export async function setSupportAgentStatus(
  id: string,
  status: SupportAgentStatus,
  db: Queryable = pool,
): Promise<SupportAgent | null> {
  const result = await db.query<SupportAgent>(
    `UPDATE support_agents SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return result.rows[0] ?? null;
}

export interface SupportAgentWithWorkload extends SupportAgent {
  open_ticket_count: number;
}

// One query for the Tim Support tab — each agent's current open-ticket
// load, so an admin can see who's overloaded before assigning more.
export async function listSupportAgentsWithWorkload(db: Queryable = pool): Promise<SupportAgentWithWorkload[]> {
  const result = await db.query<SupportAgentWithWorkload>(
    `SELECT sa.*,
            COUNT(mc.id) FILTER (WHERE mc.status = 'OPEN')::int AS open_ticket_count
     FROM support_agents sa
     LEFT JOIN mitra_complaints mc ON mc.assigned_agent_id = sa.id
     GROUP BY sa.id
     ORDER BY sa.full_name ASC`,
  );
  return result.rows;
}

// Only agents who can actually take a new ticket — the assign-ticket
// dialog's picker.
export async function listActiveSupportAgents(db: Queryable = pool): Promise<SupportAgent[]> {
  const result = await db.query<SupportAgent>(
    `SELECT * FROM support_agents WHERE status = 'ACTIVE' ORDER BY full_name ASC`,
  );
  return result.rows;
}
