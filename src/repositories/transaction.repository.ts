import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { Transaction, TransactionEvent, TransactionStatus } from "@/types/transaction";
import type { WalletAccountType } from "@/types/wallet";

const UNIQUE_VIOLATION = "23505";

export interface CreateTransactionInput {
  idempotency_key: string;
  wallet_id: string;
  product_id: string;
  customer_number: string;
  base_price: string | number;
  selling_price: string | number;
  provider?: string;
}

export interface CreateTransactionResult {
  transaction: Transaction;
  /** true if a transaction with this idempotency_key already existed. */
  alreadyExisted: boolean;
}

// Double-click / retry safe: a second INSERT with the same idempotency_key
// hits the UNIQUE constraint (23505) instead of creating a second financial
// transaction — the existing row is returned instead of throwing.
export async function createTransaction(
  input: CreateTransactionInput,
  db: Queryable = pool,
): Promise<CreateTransactionResult> {
  try {
    const result = await db.query<Transaction>(
      `INSERT INTO transactions (
         idempotency_key, wallet_id, product_id, customer_number, base_price, selling_price, provider, status
       ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'digiflazz'), 'RESERVED')
       RETURNING *`,
      [
        input.idempotency_key,
        input.wallet_id,
        input.product_id,
        input.customer_number,
        input.base_price,
        input.selling_price,
        input.provider ?? null,
      ],
    );
    return { transaction: result.rows[0], alreadyExisted: false };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existing = await findTransactionByIdempotencyKey(input.idempotency_key, db);
      if (existing) {
        return { transaction: existing, alreadyExisted: true };
      }
    }
    throw error;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}

export async function findTransactionByIdempotencyKey(
  idempotencyKey: string,
  db: Queryable = pool,
): Promise<Transaction | null> {
  const result = await db.query<Transaction>(`SELECT * FROM transactions WHERE idempotency_key = $1`, [
    idempotencyKey,
  ]);
  return result.rows[0] ?? null;
}

export async function findTransactionById(id: string, db: Queryable = pool): Promise<Transaction | null> {
  const result = await db.query<Transaction>(`SELECT * FROM transactions WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function setProviderReference(
  id: string,
  providerReference: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(`UPDATE transactions SET provider_reference = $2 WHERE id = $1`, [id, providerReference]);
}

/**
 * Compare-and-swap status transition: only succeeds if the row is still in
 * `fromStatus`. Returns null (not an error) if another process already
 * moved it — the standard way this codebase prevents double capture/
 * release when a webhook and the pending-transaction-check job race.
 */
export async function transitionTransactionStatus(
  id: string,
  fromStatus: TransactionStatus,
  toStatus: TransactionStatus,
  extra: { provider_transaction_id?: string } = {},
  db: Queryable = pool,
): Promise<Transaction | null> {
  const result = await db.query<Transaction>(
    `UPDATE transactions
     SET status = $3, provider_transaction_id = COALESCE($4, provider_transaction_id)
     WHERE id = $1 AND status = $2
     RETURNING *`,
    [id, fromStatus, toStatus, extra.provider_transaction_id ?? null],
  );
  return result.rows[0] ?? null;
}

export async function recordTransactionEvent(
  input: {
    transaction_id: string;
    from_status: TransactionStatus | null;
    to_status: TransactionStatus;
    provider_raw_response?: unknown;
  },
  db: Queryable = pool,
): Promise<TransactionEvent> {
  const result = await db.query<TransactionEvent>(
    `INSERT INTO transaction_events (transaction_id, from_status, to_status, provider_raw_response)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.transaction_id,
      input.from_status,
      input.to_status,
      input.provider_raw_response ? JSON.stringify(input.provider_raw_response) : null,
    ],
  );
  return result.rows[0];
}

// Used by the pending-transaction-check job.
export async function listByStatus(
  status: TransactionStatus,
  limit = 100,
  db: Queryable = pool,
): Promise<Transaction[]> {
  const result = await db.query<Transaction>(
    `SELECT * FROM transactions WHERE status = $1 ORDER BY created_at ASC LIMIT $2`,
    [status, limit],
  );
  return result.rows;
}

export async function listByWallet(
  walletId: string,
  limit = 50,
  db: Queryable = pool,
): Promise<Transaction[]> {
  const result = await db.query<Transaction>(
    `SELECT * FROM transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [walletId, limit],
  );
  return result.rows;
}

export async function listTransactionEvents(transactionId: string, db: Queryable = pool): Promise<TransactionEvent[]> {
  const result = await db.query<TransactionEvent>(
    `SELECT * FROM transaction_events WHERE transaction_id = $1 ORDER BY created_at ASC`,
    [transactionId],
  );
  return result.rows;
}

// --- Admin monitoring (Transaksi menu) ------------------------------------
//
// Same owner-resolution pattern as wallet.repository.ts's OWNER_JOIN — a
// transaction's wallet_id can belong to a BUMDes, Konter, or plain user.

const OWNER_JOIN = `
  JOIN wallets w ON w.id = t.wallet_id
  JOIN wallet_accounts wa ON wa.id = w.wallet_account_id
  LEFT JOIN bumdes b ON b.id = wa.bumdes_id
  LEFT JOIN konters k ON k.id = wa.konter_id
  LEFT JOIN users u ON u.id = wa.user_id
  JOIN products p ON p.id = t.product_id
`;
const OWNER_NAME_EXPR = `COALESCE(b.name, k.name, u.full_name)`;

export interface TransactionWithDetail extends Transaction {
  owner_name: string;
  product_name: string;
  product_sku: string;
}

export interface ListTransactionsFilter {
  status?: TransactionStatus;
  search?: string;
  /** BUMDes/Konter/Affiliate(USER) — issue M18 §38's "Laporan" filter list. */
  ownerType?: WalletAccountType;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

function buildTransactionFilterConditions(filter: ListTransactionsFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.status) {
    params.push(filter.status);
    conditions.push(`t.status = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    conditions.push(
      `(${OWNER_NAME_EXPR} ILIKE $${params.length} OR p.product_name ILIKE $${params.length} OR t.customer_number ILIKE $${params.length} OR t.idempotency_key ILIKE $${params.length})`,
    );
  }
  if (filter.ownerType) {
    params.push(filter.ownerType);
    conditions.push(`wa.account_type = $${params.length}`);
  }
  if (filter.dateFrom) {
    params.push(filter.dateFrom);
    conditions.push(`t.created_at >= $${params.length}`);
  }
  if (filter.dateTo) {
    params.push(filter.dateTo);
    conditions.push(`t.created_at <= $${params.length}`);
  }

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

export async function listTransactionsWithDetail(
  filter: ListTransactionsFilter = {},
  db: Queryable = pool,
): Promise<TransactionWithDetail[]> {
  const { where, params } = buildTransactionFilterConditions(filter);
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<TransactionWithDetail>(
    `SELECT t.*, ${OWNER_NAME_EXPR} AS owner_name, p.product_name, p.sku AS product_sku
     FROM transactions t
     ${OWNER_JOIN}
     ${where}
     ORDER BY t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countTransactionsWithDetail(
  filter: ListTransactionsFilter = {},
  db: Queryable = pool,
): Promise<number> {
  const { where, params } = buildTransactionFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM transactions t ${OWNER_JOIN} ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}

export async function findTransactionWithDetailById(
  id: string,
  db: Queryable = pool,
): Promise<TransactionWithDetail | null> {
  const result = await db.query<TransactionWithDetail>(
    `SELECT t.*, ${OWNER_NAME_EXPR} AS owner_name, p.product_name, p.sku AS product_sku
     FROM transactions t
     ${OWNER_JOIN}
     WHERE t.id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export interface TransactionVolumeSummary {
  count: number;
  total_value: string;
}

// The Laporan menu's "total transaksi" metric — count and total selling
// value of completed (SUCCESS) purchases in the filtered window. Same
// filter shape as listTransactionsWithDetail, minus `status` (always
// pinned to SUCCESS here since a report cares about completed revenue).
export async function sumTransactionVolume(
  filter: Omit<ListTransactionsFilter, "status" | "search" | "limit" | "offset"> = {},
  db: Queryable = pool,
): Promise<TransactionVolumeSummary> {
  const { where, params } = buildTransactionFilterConditions({ ...filter, status: "SUCCESS" });
  const result = await db.query<{ count: string; total_value: string | null }>(
    `SELECT COUNT(*) AS count, COALESCE(SUM(t.selling_price), 0) AS total_value
     FROM transactions t
     ${OWNER_JOIN}
     ${where}`,
    params,
  );
  return { count: Number(result.rows[0].count), total_value: result.rows[0].total_value ?? "0" };
}
