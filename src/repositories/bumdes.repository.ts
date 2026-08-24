import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";

export type BumdesStatus = "ACTIVE" | "SUSPENDED";

export interface Bumdes {
  id: string;
  name: string;
  admin_user_id: string;
  address: string | null;
  status: BumdesStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBumdesInput {
  name: string;
  admin_user_id: string;
  address?: string | null;
}

export async function createBumdes(input: CreateBumdesInput, db: Queryable = pool): Promise<Bumdes> {
  const result = await db.query<Bumdes>(
    `INSERT INTO bumdes (name, admin_user_id, address)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.name, input.admin_user_id, input.address ?? null],
  );
  return result.rows[0];
}

export async function findBumdesById(id: string, db: Queryable = pool): Promise<Bumdes | null> {
  const result = await db.query<Bumdes>(`SELECT * FROM bumdes WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function listBumdes(db: Queryable = pool): Promise<Bumdes[]> {
  const result = await db.query<Bumdes>(`SELECT * FROM bumdes ORDER BY created_at DESC`);
  return result.rows;
}

export async function updateBumdesStatus(
  id: string,
  status: BumdesStatus,
  db: Queryable = pool,
): Promise<Bumdes | null> {
  const result = await db.query<Bumdes>(
    `UPDATE bumdes SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return result.rows[0] ?? null;
}
