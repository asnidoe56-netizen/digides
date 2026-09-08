import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { Store } from "@/types/store";

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
