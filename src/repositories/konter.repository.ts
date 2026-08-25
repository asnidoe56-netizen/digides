import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";

export type KonterStatus = "ACTIVE" | "SUSPENDED";

export interface Konter {
  id: string;
  bumdes_id: string;
  operator_user_id: string;
  name: string;
  status: KonterStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateKonterInput {
  bumdes_id: string;
  operator_user_id: string;
  name: string;
}

export async function createKonter(input: CreateKonterInput, db: Queryable = pool): Promise<Konter> {
  const result = await db.query<Konter>(
    `INSERT INTO konters (bumdes_id, operator_user_id, name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.bumdes_id, input.operator_user_id, input.name],
  );
  return result.rows[0];
}

export async function findKonterById(id: string, db: Queryable = pool): Promise<Konter | null> {
  const result = await db.query<Konter>(`SELECT * FROM konters WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

// Resolves "which Konter am I" for a logged-in KONTER session — the same
// reasoning as findBumdesByAdminUserId (bumdes.repository.ts): the home
// screen's own wallet/identity is looked up server-side from the session,
// never trusted from a client-supplied id.
export async function findKonterByOperatorUserId(operatorUserId: string, db: Queryable = pool): Promise<Konter | null> {
  const result = await db.query<Konter>(`SELECT * FROM konters WHERE operator_user_id = $1`, [operatorUserId]);
  return result.rows[0] ?? null;
}

export async function listKontersByBumdes(bumdesId: string, db: Queryable = pool): Promise<Konter[]> {
  const result = await db.query<Konter>(
    `SELECT * FROM konters WHERE bumdes_id = $1 ORDER BY created_at DESC`,
    [bumdesId],
  );
  return result.rows;
}

export async function countKonters(db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>(`SELECT COUNT(*) FROM konters`);
  return Number(result.rows[0].count);
}

export async function updateKonterStatus(
  id: string,
  status: KonterStatus,
  db: Queryable = pool,
): Promise<Konter | null> {
  const result = await db.query<Konter>(
    `UPDATE konters SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return result.rows[0] ?? null;
}
