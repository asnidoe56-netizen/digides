import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { Payment, PaymentMethod, PaymentStatus } from "@/types/payment";

export interface CreatePaymentInput {
  wallet_id: string;
  amount: string | number;
  method: PaymentMethod;
  gateway_reference?: string | null;
  created_by?: string | null;
}

export async function createPayment(input: CreatePaymentInput, db: Queryable = pool): Promise<Payment> {
  const result = await db.query<Payment>(
    `INSERT INTO payments (wallet_id, amount, method, gateway_reference, created_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [input.wallet_id, input.amount, input.method, input.gateway_reference ?? null, input.created_by ?? null],
  );
  return result.rows[0];
}

export async function findPaymentById(id: string, db: Queryable = pool): Promise<Payment | null> {
  const result = await db.query<Payment>(`SELECT * FROM payments WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function findPaymentByGatewayReference(
  gatewayReference: string,
  db: Queryable = pool,
): Promise<Payment | null> {
  const result = await db.query<Payment>(`SELECT * FROM payments WHERE gateway_reference = $1`, [
    gatewayReference,
  ]);
  return result.rows[0] ?? null;
}

// Compare-and-swap, same pattern as transaction status transitions: a
// replayed webhook that tries to move a payment out of PENDING a second
// time affects zero rows instead of double-crediting the wallet.
export async function transitionPaymentStatus(
  id: string,
  fromStatus: PaymentStatus,
  toStatus: PaymentStatus,
  webhookPayload: unknown | null,
  db: Queryable = pool,
): Promise<Payment | null> {
  const result = await db.query<Payment>(
    `UPDATE payments
     SET status = $3, webhook_payload = COALESCE($4, webhook_payload)
     WHERE id = $1 AND status = $2
     RETURNING *`,
    [id, fromStatus, toStatus, webhookPayload ? JSON.stringify(webhookPayload) : null],
  );
  return result.rows[0] ?? null;
}
