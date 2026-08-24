import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { CommissionLedgerEntry, CommissionLedgerStatus, CommissionPayout, CommissionRule } from "@/types/commission";

export async function listActiveCommissionRules(db: Queryable = pool): Promise<CommissionRule[]> {
  const result = await db.query<CommissionRule>(
    `SELECT * FROM commission_rules
     WHERE is_active = true
       AND effective_from <= now()
       AND (effective_until IS NULL OR effective_until > now())
     ORDER BY level ASC`,
  );
  return result.rows;
}

export interface CreateCommissionLedgerEntryInput {
  transaction_id: string;
  referral_relationship_id: string;
  beneficiary_user_id: string;
  commission_rule_id: string;
  level: number;
  amount: string | number;
  available_at?: Date | null;
}

export async function createCommissionLedgerEntry(
  input: CreateCommissionLedgerEntryInput,
  db: Queryable = pool,
): Promise<CommissionLedgerEntry> {
  const result = await db.query<CommissionLedgerEntry>(
    `INSERT INTO commission_ledger (
       transaction_id, referral_relationship_id, beneficiary_user_id,
       commission_rule_id, level, amount, available_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.transaction_id,
      input.referral_relationship_id,
      input.beneficiary_user_id,
      input.commission_rule_id,
      input.level,
      input.amount,
      input.available_at ?? null,
    ],
  );
  return result.rows[0];
}

export async function listCommissionLedgerForBeneficiary(
  beneficiaryUserId: string,
  status?: CommissionLedgerStatus,
  db: Queryable = pool,
): Promise<CommissionLedgerEntry[]> {
  if (status) {
    const result = await db.query<CommissionLedgerEntry>(
      `SELECT * FROM commission_ledger WHERE beneficiary_user_id = $1 AND status = $2 ORDER BY created_at DESC`,
      [beneficiaryUserId, status],
    );
    return result.rows;
  }
  const result = await db.query<CommissionLedgerEntry>(
    `SELECT * FROM commission_ledger WHERE beneficiary_user_id = $1 ORDER BY created_at DESC`,
    [beneficiaryUserId],
  );
  return result.rows;
}

// Called by the commission-settlement job once `available_at` has passed.
export async function markCommissionAvailable(
  ids: string[],
  db: Queryable = pool,
): Promise<number> {
  const result = await db.query(
    `UPDATE commission_ledger
     SET status = 'AVAILABLE'
     WHERE id = ANY($1::uuid[]) AND status = 'PENDING' AND available_at <= now()`,
    [ids],
  );
  return result.rowCount ?? 0;
}

export async function listSettleableCommissionLedgerIds(db: Queryable = pool): Promise<string[]> {
  const result = await db.query<{ id: string }>(
    `SELECT id FROM commission_ledger WHERE status = 'PENDING' AND available_at <= now()`,
  );
  return result.rows.map((row) => row.id);
}

// Refund on the source transaction must reverse any commission it already
// generated, whether still PENDING (holding period) or already AVAILABLE
// (not yet paid out). Already-PAID commissions are a separate, manual
// clawback decision — not handled automatically here.
export async function reverseCommissionForTransaction(
  transactionId: string,
  db: Queryable = pool,
): Promise<CommissionLedgerEntry[]> {
  const result = await db.query<CommissionLedgerEntry>(
    `UPDATE commission_ledger
     SET status = 'REVERSED'
     WHERE transaction_id = $1 AND status IN ('PENDING', 'AVAILABLE')
     RETURNING *`,
    [transactionId],
  );
  return result.rows;
}

export async function createCommissionPayout(
  userId: string,
  amount: string | number,
  db: Queryable = pool,
): Promise<CommissionPayout> {
  const result = await db.query<CommissionPayout>(
    `INSERT INTO commission_payouts (user_id, amount) VALUES ($1, $2) RETURNING *`,
    [userId, amount],
  );
  return result.rows[0];
}

export async function markCommissionLedgerPaid(
  ids: string[],
  db: Queryable = pool,
): Promise<number> {
  const result = await db.query(
    `UPDATE commission_ledger SET status = 'PAID' WHERE id = ANY($1::uuid[]) AND status = 'AVAILABLE'`,
    [ids],
  );
  return result.rowCount ?? 0;
}

export async function markCommissionPayoutStatus(
  id: string,
  status: "PAID" | "FAILED",
  reference: string | null,
  db: Queryable = pool,
): Promise<CommissionPayout | null> {
  const result = await db.query<CommissionPayout>(
    `UPDATE commission_payouts
     SET status = $2, paid_at = CASE WHEN $2 = 'PAID' THEN now() ELSE paid_at END, reference = COALESCE($3, reference)
     WHERE id = $1
     RETURNING *`,
    [id, status, reference],
  );
  return result.rows[0] ?? null;
}
