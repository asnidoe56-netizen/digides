import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { Transaction, TransactionEvent, TransactionStatus } from "@/types/transaction";

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
