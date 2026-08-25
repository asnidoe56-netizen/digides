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

// Resolves "which Mitra am I" for a logged-in BUMDES_ADMIN session — the
// complaint-submission endpoint uses this rather than trusting a
// client-supplied bumdes_id.
export async function findBumdesByAdminUserId(adminUserId: string, db: Queryable = pool): Promise<Bumdes | null> {
  const result = await db.query<Bumdes>(`SELECT * FROM bumdes WHERE admin_user_id = $1`, [adminUserId]);
  return result.rows[0] ?? null;
}

export async function listBumdes(db: Queryable = pool): Promise<Bumdes[]> {
  const result = await db.query<Bumdes>(`SELECT * FROM bumdes ORDER BY created_at DESC`);
  return result.rows;
}

export async function countBumdes(db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>(`SELECT COUNT(*) FROM bumdes`);
  return Number(result.rows[0].count);
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

export interface BumdesWithDetail extends Bumdes {
  admin_email: string;
  admin_full_name: string;
  wallet_id: string | null;
  available_balance: string;
  held_balance: string;
}

// One row per Mitra (BUMDes) with its admin login and wallet balance
// attached — the Mitra list page's single query, same reasoning as
// listUsers' role aggregation (avoids an N+1 per row).
export async function listBumdesWithDetail(db: Queryable = pool): Promise<BumdesWithDetail[]> {
  const result = await db.query<BumdesWithDetail>(
    `SELECT
       b.*,
       u.email AS admin_email,
       u.full_name AS admin_full_name,
       w.id AS wallet_id,
       COALESCE(w.available_balance, 0) AS available_balance,
       COALESCE(w.held_balance, 0) AS held_balance
     FROM bumdes b
     JOIN users u ON u.id = b.admin_user_id
     LEFT JOIN wallet_accounts wa ON wa.bumdes_id = b.id
     LEFT JOIN wallets w ON w.wallet_account_id = wa.id
     ORDER BY b.created_at DESC`,
  );
  return result.rows;
}
