import type { PoolClient } from "pg";
import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { StorePaymentRequest } from "@/types/store-order";

export interface CreateStorePaymentRequestInput {
  order_id: string;
  idempotency_key: string;
  amount: string | number;
  expires_at: Date;
}

export async function createStorePaymentRequest(
  input: CreateStorePaymentRequestInput,
  client: PoolClient,
): Promise<StorePaymentRequest> {
  const result = await client.query<StorePaymentRequest>(
    `INSERT INTO store_payment_requests (order_id, idempotency_key, amount, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.order_id, input.idempotency_key, input.amount, input.expires_at],
  );
  return result.rows[0];
}

export async function findStorePaymentRequestById(
  id: string,
  db: Queryable = pool,
): Promise<StorePaymentRequest | null> {
  const result = await db.query<StorePaymentRequest>(`SELECT * FROM store_payment_requests WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

// The one, single-shot gate every payment confirmation goes through
// (PRD §6 rule 4: a retried request never creates a second payment). Only
// a still-MENUNGGU, not-yet-expired row can ever flip to BERHASIL, and the
// UPDATE's WHERE clause — not a check in the caller — is what makes that
// true: two concurrent confirms for the same row can both run this
// statement, but only one will ever match the WHERE clause and return a
// row. store-payment.service.ts's confirmStorePayment uses the 0-rows-
// affected outcome to distinguish "I just lost a race" (re-check who
// actually won) from "this was already handled long ago" (return the
// existing terminal state). Must be called with a PoolClient from an open
// withTransaction() — it always runs alongside the stock decrement and
// ledger legs in the same all-or-nothing transaction.
export async function claimStorePaymentRequestForPayment(
  id: string,
  paidByUserId: string,
  client: PoolClient,
): Promise<StorePaymentRequest | null> {
  const result = await client.query<StorePaymentRequest>(
    `UPDATE store_payment_requests
     SET status = 'BERHASIL', paid_by_user_id = $2
     WHERE id = $1 AND status = 'MENUNGGU' AND expires_at > now()
     RETURNING *`,
    [id, paidByUserId],
  );
  return result.rows[0] ?? null;
}

// Lazily called when confirmStorePayment notices a MENUNGGU request whose
// expires_at has already passed (PRD §6 rule 5: an expired QR is rejected
// even if still on screen) — same compare-and-swap shape as the claim
// above, so a request can never be "expired" out from under a payment
// that's genuinely in flight.
export async function expireStorePaymentRequest(
  id: string,
  db: Queryable = pool,
): Promise<StorePaymentRequest | null> {
  const result = await db.query<StorePaymentRequest>(
    `UPDATE store_payment_requests
     SET status = 'KEDALUWARSA'
     WHERE id = $1 AND status = 'MENUNGGU' AND expires_at <= now()
     RETURNING *`,
    [id],
  );
  return result.rows[0] ?? null;
}
