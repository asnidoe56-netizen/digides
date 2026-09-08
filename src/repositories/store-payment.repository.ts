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

// One order has exactly one payment request today (createStoreOrder makes
// them together), but ordering by created_at keeps this correct if a
// future "buat ulang QR" flow ever issues a second one for the same order.
export async function listStorePaymentRequestsByOrder(
  orderId: string,
  db: Queryable = pool,
): Promise<StorePaymentRequest[]> {
  const result = await db.query<StorePaymentRequest>(
    `SELECT * FROM store_payment_requests WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId],
  );
  return result.rows;
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
//
// Expires the request AND its order in one statement (a data-modifying
// CTE, so both see the same snapshot and neither can happen without the
// other). Before Tahap 3.5 this only touched the request, leaving the
// order stuck at PENDING forever — an order table that quietly disagreed
// with reality, which "Riwayat transaksi toko" would have surfaced as
// stale pending rows that could never resolve.
export async function expireStorePaymentRequest(
  id: string,
  db: Queryable = pool,
): Promise<StorePaymentRequest | null> {
  const result = await db.query<StorePaymentRequest>(
    `WITH expired_request AS (
       UPDATE store_payment_requests
       SET status = 'KEDALUWARSA'
       WHERE id = $1 AND status = 'MENUNGGU' AND expires_at <= now()
       RETURNING *
     ), expired_order AS (
       UPDATE store_orders o
       SET status = 'EXPIRED'
       FROM expired_request r
       WHERE o.id = r.order_id AND o.status = 'PENDING'
       RETURNING o.id
     )
     SELECT * FROM expired_request`,
    [id],
  );
  return result.rows[0] ?? null;
}

export interface ExpireStaleSummary {
  requests: number;
  orders: number;
}

// The background sweeper's one statement (src/jobs/store-payment-expiry.ts).
// Without it, a QR nobody ever tries to pay stays MENUNGGU forever, since
// the lazy path above only ever fires when someone actually attempts a
// payment. Same guarded transitions as everywhere else — a request being
// paid at this exact moment is protected by its own `status = 'MENUNGGU'`
// clause, so the sweeper can never expire a payment mid-flight.
export async function expireStalePaymentRequests(db: Queryable = pool): Promise<ExpireStaleSummary> {
  const result = await db.query<{ requests: string; orders: string }>(
    `WITH expired_requests AS (
       UPDATE store_payment_requests
       SET status = 'KEDALUWARSA'
       WHERE status = 'MENUNGGU' AND expires_at <= now()
       RETURNING id, order_id
     ), expired_orders AS (
       UPDATE store_orders o
       SET status = 'EXPIRED'
       FROM expired_requests e
       WHERE o.id = e.order_id AND o.status = 'PENDING'
       RETURNING o.id
     )
     SELECT
       (SELECT count(*) FROM expired_requests) AS requests,
       (SELECT count(*) FROM expired_orders) AS orders`,
  );
  return { requests: Number(result.rows[0].requests), orders: Number(result.rows[0].orders) };
}
