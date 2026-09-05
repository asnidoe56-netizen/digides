import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { ManualTopupDestination } from "@/types/manual-topup-destination";

// Singleton settings row (same shape/reasoning as support_settings) —
// seeded by migration 035_manual_topup_destination.sql, so exactly one row
// always exists and this never needs an upsert.
export async function getManualTopupDestination(db: Queryable = pool): Promise<ManualTopupDestination> {
  const result = await db.query<ManualTopupDestination>(`SELECT * FROM manual_topup_destinations LIMIT 1`);
  return result.rows[0];
}

export interface UpdateManualTopupDestinationInput {
  dana_number: string;
  dana_account_name: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
}

export async function updateManualTopupDestination(
  id: string,
  input: UpdateManualTopupDestinationInput,
  actorUserId: string,
  db: Queryable = pool,
): Promise<ManualTopupDestination> {
  const result = await db.query<ManualTopupDestination>(
    `UPDATE manual_topup_destinations
     SET dana_number = $2, dana_account_name = $3, bank_name = $4, bank_account_number = $5,
         bank_account_name = $6, updated_by = $7
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.dana_number,
      input.dana_account_name,
      input.bank_name,
      input.bank_account_number,
      input.bank_account_name,
      actorUserId,
    ],
  );
  return result.rows[0];
}
