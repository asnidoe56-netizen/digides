import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { ReconciliationCategory, ReconciliationRecord } from "@/types/reconciliation";

export interface CreateReconciliationRecordInput {
  transaction_id: string | null;
  provider_reference: string | null;
  local_status: string | null;
  provider_status: string | null;
  local_amount: string | number | null;
  provider_amount: string | number | null;
  category: ReconciliationCategory;
}

export async function createReconciliationRecord(
  input: CreateReconciliationRecordInput,
  db: Queryable = pool,
): Promise<ReconciliationRecord> {
  const result = await db.query<ReconciliationRecord>(
    `INSERT INTO reconciliation_records (
       transaction_id, provider_reference, local_status, provider_status,
       local_amount, provider_amount, category
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.transaction_id,
      input.provider_reference,
      input.local_status,
      input.provider_status,
      input.local_amount,
      input.provider_amount,
      input.category,
    ],
  );
  return result.rows[0];
}

export async function listByCategory(
  category: ReconciliationCategory,
  limit = 100,
  db: Queryable = pool,
): Promise<ReconciliationRecord[]> {
  const result = await db.query<ReconciliationRecord>(
    `SELECT * FROM reconciliation_records WHERE category = $1 ORDER BY checked_at DESC LIMIT $2`,
    [category, limit],
  );
  return result.rows;
}

export async function resolveRecord(
  id: string,
  resolutionNote: string,
  db: Queryable = pool,
): Promise<ReconciliationRecord | null> {
  const result = await db.query<ReconciliationRecord>(
    `UPDATE reconciliation_records
     SET resolved_at = now(), resolution_note = $2
     WHERE id = $1
     RETURNING *`,
    [id, resolutionNote],
  );
  return result.rows[0] ?? null;
}

export interface ReconciliationRecordWithDetail extends ReconciliationRecord {
  idempotency_key: string | null;
  product_name: string | null;
}

export interface ListReconciliationFilter {
  category?: ReconciliationCategory;
  /** true = only unresolved, false = only resolved, omitted = both. */
  unresolved?: boolean;
  limit?: number;
  offset?: number;
}

function buildReconciliationFilterConditions(
  filter: ListReconciliationFilter,
): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.category) {
    params.push(filter.category);
    conditions.push(`rr.category = $${params.length}`);
  }
  if (filter.unresolved === true) {
    conditions.push(`rr.resolved_at IS NULL`);
  } else if (filter.unresolved === false) {
    conditions.push(`rr.resolved_at IS NOT NULL`);
  }

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

// The Rekonsiliasi menu's list — joined to the local transaction (when one
// exists; PROVIDER_ONLY rows have none) for a human-readable reference.
export async function listReconciliationRecords(
  filter: ListReconciliationFilter = {},
  db: Queryable = pool,
): Promise<ReconciliationRecordWithDetail[]> {
  const { where, params } = buildReconciliationFilterConditions(filter);
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<ReconciliationRecordWithDetail>(
    `SELECT rr.*, t.idempotency_key, p.product_name
     FROM reconciliation_records rr
     LEFT JOIN transactions t ON t.id = rr.transaction_id
     LEFT JOIN products p ON p.id = t.product_id
     ${where}
     ORDER BY rr.checked_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countReconciliationRecords(
  filter: ListReconciliationFilter = {},
  db: Queryable = pool,
): Promise<number> {
  const { where, params } = buildReconciliationFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM reconciliation_records rr ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}

export async function findReconciliationRecordById(
  id: string,
  db: Queryable = pool,
): Promise<ReconciliationRecord | null> {
  const result = await db.query<ReconciliationRecord>(`SELECT * FROM reconciliation_records WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}
