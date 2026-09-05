import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { CommissionLedgerEntry, CommissionLedgerStatus, CommissionPayout, CommissionRule, CommissionType } from "@/types/commission";
import type { ReferralCodeHolderStatus } from "@/types/referral";

export interface CreateCommissionRuleInput {
  level: number;
  commission_type: CommissionType;
  /** Required when commission_type is PERCENTAGE. */
  percentage?: string | number | null;
  /** Required when commission_type is FLAT. */
  flat_amount?: string | number | null;
  /** Null applies the rule to both USER and MITRA referrers. */
  applies_to_holder_status?: ReferralCodeHolderStatus | null;
  min_transaction?: string | number | null;
  min_payout?: string | number;
  holding_period_days?: number;
  eligible_category_id?: string | null;
  max_commission?: string | number | null;
}

export async function createCommissionRule(
  input: CreateCommissionRuleInput,
  db: Queryable = pool,
): Promise<CommissionRule> {
  const result = await db.query<CommissionRule>(
    `INSERT INTO commission_rules (
       level, commission_type, percentage, flat_amount, applies_to_holder_status,
       min_transaction, min_payout, holding_period_days, eligible_category_id, max_commission
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      input.level,
      input.commission_type,
      input.percentage ?? null,
      input.flat_amount ?? null,
      input.applies_to_holder_status ?? null,
      input.min_transaction ?? null,
      input.min_payout ?? 0,
      input.holding_period_days ?? 0,
      input.eligible_category_id ?? null,
      input.max_commission ?? null,
    ],
  );
  return result.rows[0];
}

export async function findCommissionRuleById(id: string, db: Queryable = pool): Promise<CommissionRule | null> {
  const result = await db.query<CommissionRule>(`SELECT * FROM commission_rules WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export type UpdateCommissionRuleInput = CreateCommissionRuleInput & { is_active: boolean };

export async function updateCommissionRule(
  id: string,
  input: UpdateCommissionRuleInput,
  db: Queryable = pool,
): Promise<CommissionRule | null> {
  const result = await db.query<CommissionRule>(
    `UPDATE commission_rules SET
       level = $2, commission_type = $3, percentage = $4, flat_amount = $5, applies_to_holder_status = $6,
       min_transaction = $7, min_payout = $8, holding_period_days = $9, eligible_category_id = $10,
       max_commission = $11, is_active = $12
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.level,
      input.commission_type,
      input.percentage ?? null,
      input.flat_amount ?? null,
      input.applies_to_holder_status ?? null,
      input.min_transaction ?? null,
      input.min_payout ?? 0,
      input.holding_period_days ?? 0,
      input.eligible_category_id ?? null,
      input.max_commission ?? null,
      input.is_active,
    ],
  );
  return result.rows[0] ?? null;
}

// Every rule regardless of active/expired state — the Aturan Komisi tab's
// management table. listActiveCommissionRules below stays the one the
// award engine uses (only currently-effective rules).
export async function listCommissionRules(db: Queryable = pool): Promise<CommissionRule[]> {
  const result = await db.query<CommissionRule>(`SELECT * FROM commission_rules ORDER BY level ASC, created_at DESC`);
  return result.rows;
}

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

export interface CommissionLedgerEntryWithDetail extends CommissionLedgerEntry {
  beneficiary_name: string;
  beneficiary_email: string;
  rule_commission_type: CommissionType;
  rule_percentage: string | null;
  rule_flat_amount: string | null;
}

export interface ListCommissionLedgerFilter {
  status?: CommissionLedgerStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

function buildCommissionLedgerFilterConditions(
  filter: ListCommissionLedgerFilter,
): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.status) {
    params.push(filter.status);
    conditions.push(`cl.status = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

// Platform-wide commission feed for the Komisi menu's Ledger tab — every
// beneficiary, not scoped to one user (that's listCommissionLedgerForBeneficiary).
export async function listCommissionLedgerGlobal(
  filter: ListCommissionLedgerFilter = {},
  db: Queryable = pool,
): Promise<CommissionLedgerEntryWithDetail[]> {
  const { where, params } = buildCommissionLedgerFilterConditions(filter);
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<CommissionLedgerEntryWithDetail>(
    `SELECT cl.*, u.full_name AS beneficiary_name, u.email AS beneficiary_email,
       cr.commission_type AS rule_commission_type, cr.percentage AS rule_percentage, cr.flat_amount AS rule_flat_amount
     FROM commission_ledger cl
     JOIN users u ON u.id = cl.beneficiary_user_id
     JOIN commission_rules cr ON cr.id = cl.commission_rule_id
     ${where}
     ORDER BY cl.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countCommissionLedgerGlobal(
  filter: ListCommissionLedgerFilter = {},
  db: Queryable = pool,
): Promise<number> {
  const { where, params } = buildCommissionLedgerFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM commission_ledger cl
     JOIN users u ON u.id = cl.beneficiary_user_id
     ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}

export interface AvailableCommissionSummary {
  beneficiary_user_id: string;
  beneficiary_name: string;
  beneficiary_email: string;
  available_amount: string;
  entry_count: number;
}

// One row per beneficiary with at least one AVAILABLE entry — what the
// Payout tab offers to pay out. Grouped here instead of in the service so
// "who has something to pay" is a single query, not N.
export async function summarizeAvailableCommissionByBeneficiary(
  db: Queryable = pool,
): Promise<AvailableCommissionSummary[]> {
  const result = await db.query<AvailableCommissionSummary>(
    `SELECT
       cl.beneficiary_user_id,
       u.full_name AS beneficiary_name,
       u.email AS beneficiary_email,
       SUM(cl.amount) AS available_amount,
       COUNT(*)::int AS entry_count
     FROM commission_ledger cl
     JOIN users u ON u.id = cl.beneficiary_user_id
     WHERE cl.status = 'AVAILABLE'
     GROUP BY cl.beneficiary_user_id, u.full_name, u.email
     HAVING SUM(cl.amount) > 0
     ORDER BY SUM(cl.amount) DESC`,
  );
  return result.rows;
}

export interface CommissionPayoutWithBeneficiary extends CommissionPayout {
  beneficiary_name: string;
  beneficiary_email: string;
}

export async function listCommissionPayouts(
  limit = 50,
  db: Queryable = pool,
): Promise<CommissionPayoutWithBeneficiary[]> {
  const result = await db.query<CommissionPayoutWithBeneficiary>(
    `SELECT cp.*, u.full_name AS beneficiary_name, u.email AS beneficiary_email
     FROM commission_payouts cp
     JOIN users u ON u.id = cp.user_id
     ORDER BY cp.requested_at DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}
