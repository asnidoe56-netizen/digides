import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { Store, StoreStatus } from "@/types/store";

export interface CreateStoreInput {
  owner_user_id: string;
  name: string;
  province_code?: string | null;
  regency_code?: string | null;
  district_code?: string | null;
  village_code?: string | null;
  address_detail?: string | null;
}

// Inserted directly as SUBMITTED — there is no draft-saving UI yet
// (Tahap 4), so registerStore (store.service.ts) always submits the whole
// form in one call. submitted_at is set here rather than defaulted at the
// column level so a future draft-saving flow can insert as DRAFT (no
// submitted_at) and call a separate submitStore() when the owner finishes.
export async function createStore(input: CreateStoreInput, db: Queryable = pool): Promise<Store> {
  const result = await db.query<Store>(
    `INSERT INTO stores (
       owner_user_id, name, status, province_code, regency_code, district_code, village_code, address_detail, submitted_at
     ) VALUES ($1, $2, 'SUBMITTED', $3, $4, $5, $6, $7, now())
     RETURNING *`,
    [
      input.owner_user_id,
      input.name,
      input.province_code ?? null,
      input.regency_code ?? null,
      input.district_code ?? null,
      input.village_code ?? null,
      input.address_detail ?? null,
    ],
  );
  return result.rows[0];
}

export async function findStoreById(id: string, db: Queryable = pool): Promise<Store | null> {
  const result = await db.query<Store>(`SELECT * FROM stores WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function findStoreByOwnerUserId(ownerUserId: string, db: Queryable = pool): Promise<Store | null> {
  const result = await db.query<Store>(`SELECT * FROM stores WHERE owner_user_id = $1`, [ownerUserId]);
  return result.rows[0] ?? null;
}

// --- Super Admin: daftar toko -------------------------------------------

export interface StoreListItem extends Store {
  owner_name: string;
  owner_email: string;
  /** The store wallet's available balance, so an admin can see at a glance
   *  whether a store already holds money before acting on it. */
  wallet_balance: string;
}

export interface ListStoresFilter {
  status?: StoreStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

function buildStoreFilter(filter: ListStoresFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.status) {
    params.push(filter.status);
    conditions.push(`s.status = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    conditions.push(`(s.name ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`);
  }

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

// Read-only listing for the Super Admin's Toko menu — the one place a
// store awaiting verification becomes visible. Joins the owner (for a
// human name to recognise) and the store's wallet (LEFT JOIN: a wallet is
// always provisioned with the store, but a LEFT JOIN means a hypothetical
// missing one shows as a store with no balance rather than vanishing from
// the list entirely).
export async function listStoresForAdmin(
  filter: ListStoresFilter = {},
  db: Queryable = pool,
): Promise<StoreListItem[]> {
  const { where, params } = buildStoreFilter(filter);
  params.push(filter.limit ?? 20, filter.offset ?? 0);

  const result = await db.query<StoreListItem>(
    `SELECT s.*,
            u.full_name AS owner_name,
            u.email AS owner_email,
            COALESCE(w.available_balance, 0) AS wallet_balance
     FROM stores s
     JOIN users u ON u.id = s.owner_user_id
     LEFT JOIN wallet_accounts wa ON wa.store_id = s.id
     LEFT JOIN wallets w ON w.wallet_account_id = wa.id
     ${where}
     ORDER BY
       -- Stores waiting on the admin come first; that is the whole reason
       -- this screen exists.
       CASE WHEN s.status = 'SUBMITTED' THEN 0 ELSE 1 END,
       s.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countStoresForAdmin(
  filter: ListStoresFilter = {},
  db: Queryable = pool,
): Promise<number> {
  const { where, params } = buildStoreFilter(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM stores s JOIN users u ON u.id = s.owner_user_id ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}

export async function countStoresByStatus(
  status: StoreStatus,
  db: Queryable = pool,
): Promise<number> {
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM stores WHERE status = $1`,
    [status],
  );
  return Number(result.rows[0].count);
}

// Compare-and-swap on status, same discipline as the PPOB transaction
// engine's status transitions: only a SUBMITTED store can become ACTIVE,
// and the UPDATE's WHERE clause is what actually enforces that (not just a
// check in the caller), so a double-click or concurrent request can never
// re-verify an already-ACTIVE store or skip past SUBMITTED.
export async function verifyStore(
  storeId: string,
  verifiedByUserId: string,
  db: Queryable = pool,
): Promise<Store | null> {
  const result = await db.query<Store>(
    `UPDATE stores
     SET status = 'ACTIVE', verified_at = now(), verified_by = $2
     WHERE id = $1 AND status = 'SUBMITTED'
     RETURNING *`,
    [storeId, verifiedByUserId],
  );
  return result.rows[0] ?? null;
}
