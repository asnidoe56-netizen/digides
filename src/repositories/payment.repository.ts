import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { ManualTopupChannel, Payment, PaymentMethod, PaymentStatus } from "@/types/payment";

export interface CreatePaymentInput {
  wallet_id: string;
  amount: string | number;
  method: PaymentMethod;
  gateway_reference?: string | null;
  manual_channel?: ManualTopupChannel | null;
  created_by?: string | null;
}

export async function createPayment(input: CreatePaymentInput, db: Queryable = pool): Promise<Payment> {
  const result = await db.query<Payment>(
    `INSERT INTO payments (wallet_id, amount, method, gateway_reference, manual_channel, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.wallet_id,
      input.amount,
      input.method,
      input.gateway_reference ?? null,
      input.manual_channel ?? null,
      input.created_by ?? null,
    ],
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

// --- Wallet Management "Top Up" tab (M18) -----------------------------

export interface PaymentWithOwner extends Payment {
  owner_name: string;
}

export interface ListPaymentsFilter {
  status?: PaymentStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

function buildPaymentFilterConditions(filter: ListPaymentsFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.status) {
    params.push(filter.status);
    conditions.push(`p.status = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    conditions.push(
      `(b.name ILIKE $${params.length} OR k.name ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`,
    );
  }

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

const OWNER_JOIN = `
  JOIN wallets w ON w.id = p.wallet_id
  JOIN wallet_accounts wa ON wa.id = w.wallet_account_id
  LEFT JOIN bumdes b ON b.id = wa.bumdes_id
  LEFT JOIN konters k ON k.id = wa.konter_id
  LEFT JOIN users u ON u.id = wa.user_id
`;

export async function listPayments(
  filter: ListPaymentsFilter = {},
  db: Queryable = pool,
): Promise<PaymentWithOwner[]> {
  const { where, params } = buildPaymentFilterConditions(filter);
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<PaymentWithOwner>(
    `SELECT p.*, COALESCE(b.name, k.name, u.full_name) AS owner_name
     FROM payments p
     ${OWNER_JOIN}
     ${where}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countPayments(filter: ListPaymentsFilter = {}, db: Queryable = pool): Promise<number> {
  const { where, params } = buildPaymentFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM payments p ${OWNER_JOIN} ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}
