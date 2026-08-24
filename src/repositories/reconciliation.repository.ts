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
