import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { ManualPaymentMethod } from "@/types/manual-payment-method";
import type { ManualTopupChannel } from "@/types/payment";

// Every method regardless of active state — Super Admin's own management
// list (Pengaturan > Top Up Manual), where a disabled method must still be
// visible to be re-enabled.
export async function listManualPaymentMethods(db: Queryable = pool): Promise<ManualPaymentMethod[]> {
  const result = await db.query<ManualPaymentMethod>(
    `SELECT * FROM manual_payment_methods ORDER BY sort_order ASC`,
  );
  return result.rows;
}

// Only what a Mitra should actually be offered on the Isi Saldo screen.
export async function listActiveManualPaymentMethods(db: Queryable = pool): Promise<ManualPaymentMethod[]> {
  const result = await db.query<ManualPaymentMethod>(
    `SELECT * FROM manual_payment_methods WHERE is_active = true ORDER BY sort_order ASC`,
  );
  return result.rows;
}

export async function findManualPaymentMethodById(
  id: string,
  db: Queryable = pool,
): Promise<ManualPaymentMethod | null> {
  const result = await db.query<ManualPaymentMethod>(`SELECT * FROM manual_payment_methods WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function findActiveManualPaymentMethodByCode(
  code: ManualTopupChannel,
  db: Queryable = pool,
): Promise<ManualPaymentMethod | null> {
  const result = await db.query<ManualPaymentMethod>(
    `SELECT * FROM manual_payment_methods WHERE code = $1 AND is_active = true`,
    [code],
  );
  return result.rows[0] ?? null;
}

export interface CreateManualPaymentMethodInput {
  code: string;
  display_name: string;
  account_number: string;
  account_name: string;
}

// "Tambah Metode" — code is UNIQUE (not a fixed enum, see
// types/payment.ts's ManualTopupChannel), so a duplicate code surfaces as
// a thrown pg error the route translates into a friendly message.
export async function createManualPaymentMethod(
  input: CreateManualPaymentMethodInput,
  actorUserId: string,
  db: Queryable = pool,
): Promise<ManualPaymentMethod> {
  const nextSortOrder = await db.query<{ next: number }>(
    `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next FROM manual_payment_methods`,
  );
  const result = await db.query<ManualPaymentMethod>(
    `INSERT INTO manual_payment_methods (code, display_name, account_number, account_name, is_active, sort_order, updated_by)
     VALUES ($1, $2, $3, $4, false, $5, $6)
     RETURNING *`,
    [input.code, input.display_name, input.account_number, input.account_name, nextSortOrder.rows[0].next, actorUserId],
  );
  return result.rows[0];
}

export interface UpdateManualPaymentMethodInput {
  display_name: string;
  account_number: string;
  account_name: string;
}

export async function updateManualPaymentMethod(
  id: string,
  input: UpdateManualPaymentMethodInput,
  actorUserId: string,
  db: Queryable = pool,
): Promise<ManualPaymentMethod | null> {
  const result = await db.query<ManualPaymentMethod>(
    `UPDATE manual_payment_methods
     SET display_name = $2, account_number = $3, account_name = $4, updated_by = $5
     WHERE id = $1
     RETURNING *`,
    [id, input.display_name, input.account_number, input.account_name, actorUserId],
  );
  return result.rows[0] ?? null;
}

export async function setManualPaymentMethodActive(
  id: string,
  isActive: boolean,
  actorUserId: string,
  db: Queryable = pool,
): Promise<ManualPaymentMethod | null> {
  const result = await db.query<ManualPaymentMethod>(
    `UPDATE manual_payment_methods SET is_active = $2, updated_by = $3 WHERE id = $1 RETURNING *`,
    [id, isActive, actorUserId],
  );
  return result.rows[0] ?? null;
}
