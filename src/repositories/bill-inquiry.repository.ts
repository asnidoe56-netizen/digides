import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { BillInquiry, BillInquiryStatus } from "@/types/postpaid";

export interface CreateBillInquiryInput {
  ref_id: string;
  user_id: string;
  wallet_id: string;
  product_id: string;
  buyer_sku_code: string;
  customer_no: string;
  input_parts?: Record<string, string> | null;
  extra_params?: Record<string, string | number> | null;
  status: BillInquiryStatus;
  rc?: string | null;
  message?: string | null;
  customer_name?: string | null;
  periode?: string | null;
  bill_sheets?: number | null;
  admin_fee?: string | number | null;
  provider_price?: string | number | null;
  provider_selling_price?: string | number | null;
  service_fee?: string | number | null;
  total_amount?: string | number | null;
  bill_desc?: unknown;
  raw_response: unknown;
  expires_at: Date;
}

// Satu baris per cek tagihan, sukses maupun gagal. Yang gagal ikut disimpan
// supaya alasan penolakan Digiflazz bisa ditelusuri tanpa menebak.
export async function createBillInquiry(
  input: CreateBillInquiryInput,
  db: Queryable = pool,
): Promise<BillInquiry> {
  const result = await db.query<BillInquiry>(
    `INSERT INTO bill_inquiries (
       ref_id, user_id, wallet_id, product_id, buyer_sku_code, customer_no,
       input_parts, extra_params, status, rc, message, customer_name, periode,
       bill_sheets, admin_fee, provider_price, provider_selling_price,
       service_fee, total_amount, bill_desc, raw_response, expires_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
       $15, $16, $17, $18, $19, $20, $21, $22)
     RETURNING *`,
    [
      input.ref_id,
      input.user_id,
      input.wallet_id,
      input.product_id,
      input.buyer_sku_code,
      input.customer_no,
      input.input_parts ? JSON.stringify(input.input_parts) : null,
      input.extra_params ? JSON.stringify(input.extra_params) : null,
      input.status,
      input.rc ?? null,
      input.message ?? null,
      input.customer_name ?? null,
      input.periode ?? null,
      input.bill_sheets ?? null,
      input.admin_fee ?? null,
      input.provider_price ?? null,
      input.provider_selling_price ?? null,
      input.service_fee ?? null,
      input.total_amount ?? null,
      input.bill_desc === undefined ? null : JSON.stringify(input.bill_desc),
      JSON.stringify(input.raw_response),
      input.expires_at,
    ],
  );
  return result.rows[0];
}

export async function findBillInquiryById(id: string, db: Queryable = pool): Promise<BillInquiry | null> {
  const result = await db.query<BillInquiry>(`SELECT * FROM bill_inquiries WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function findBillInquiryByRefId(refId: string, db: Queryable = pool): Promise<BillInquiry | null> {
  const result = await db.query<BillInquiry>(`SELECT * FROM bill_inquiries WHERE ref_id = $1`, [refId]);
  return result.rows[0] ?? null;
}

// Digiflazz meminta panggilan untuk data yang sama tidak diulang dalam kurang
// dari satu menit (PRD §7.15 & §7.17). Mitra yang menekan "Cek Tagihan" dua
// kali karena ragu mendapat hasil yang sama, bukan panggilan kedua.
export async function findReusableBillInquiry(
  params: { userId: string; productId: string; customerNo: string; withinSeconds: number },
  db: Queryable = pool,
): Promise<BillInquiry | null> {
  const result = await db.query<BillInquiry>(
    `SELECT * FROM bill_inquiries
     WHERE user_id = $1
       AND product_id = $2
       AND customer_no = $3
       AND status = 'SUCCESS'
       AND expires_at > now()
       AND created_at > now() - make_interval(secs => $4::float8)
     ORDER BY created_at DESC
     LIMIT 1`,
    [params.userId, params.productId, params.customerNo, params.withinSeconds],
  );
  return result.rows[0] ?? null;
}

// Pagar jumlah cek tagihan per mitra (PRD §7.15): cek tagihan murah bagi
// mitra, tapi Digiflazz membatasinya (rc 86) untuk seluruh akun Digides.
export async function countBillInquiriesSince(
  userId: string,
  seconds: number,
  db: Queryable = pool,
): Promise<number> {
  const result = await db.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM bill_inquiries
     WHERE user_id = $1 AND created_at > now() - make_interval(secs => $2::float8)`,
    [userId, seconds],
  );
  return Number(result.rows[0].n);
}
