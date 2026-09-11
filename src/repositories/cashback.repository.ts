import type { PoolClient } from "pg";
import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { CashbackLedgerEntry, CashbackRule, CashbackScopeType, CashbackType } from "@/types/cashback";

// --- aturan --------------------------------------------------------------

// Semua aturan yang sedang berlaku HARI INI. Penyaringan masa berlaku
// dilakukan di SQL, bukan di JavaScript: aturan yang kedaluwarsa tidak
// boleh sempat terbaca sama sekali, dan `now()` milik basis data adalah
// jam yang sama yang dipakai seluruh sistem ini.
export async function listActiveCashbackRules(db: Queryable = pool): Promise<CashbackRule[]> {
  const result = await db.query<CashbackRule>(
    `SELECT * FROM cashback_rules
     WHERE is_active = true
       AND effective_from <= now()
       AND (effective_until IS NULL OR effective_until > now())`,
  );
  return result.rows;
}

export async function listCashbackRules(db: Queryable = pool): Promise<CashbackRule[]> {
  const result = await db.query<CashbackRule>(
    `SELECT * FROM cashback_rules ORDER BY is_active DESC, priority DESC, created_at DESC`,
  );
  return result.rows;
}

export async function findCashbackRuleById(id: string, db: Queryable = pool): Promise<CashbackRule | null> {
  const result = await db.query<CashbackRule>(`SELECT * FROM cashback_rules WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export interface CreateCashbackRuleInput {
  scope_type: CashbackScopeType;
  category_id?: string | null;
  brand_id?: string | null;
  product_id?: string | null;
  cashback_type: CashbackType;
  cashback_value: number;
  min_transaction?: number | null;
  max_cashback?: number | null;
  priority?: number;
  effective_from?: Date | null;
  effective_until?: Date | null;
}

export async function createCashbackRule(
  input: CreateCashbackRuleInput,
  db: Queryable = pool,
): Promise<CashbackRule> {
  const result = await db.query<CashbackRule>(
    `INSERT INTO cashback_rules
       (scope_type, category_id, brand_id, product_id, cashback_type, cashback_value,
        min_transaction, max_cashback, priority, effective_from, effective_until)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, now()), $11)
     RETURNING *`,
    [
      input.scope_type,
      input.category_id ?? null,
      input.brand_id ?? null,
      input.product_id ?? null,
      input.cashback_type,
      input.cashback_value,
      input.min_transaction ?? null,
      input.max_cashback ?? null,
      input.priority ?? 0,
      input.effective_from ?? null,
      input.effective_until ?? null,
    ],
  );
  return result.rows[0];
}

export interface UpdateCashbackRuleInput {
  cashback_type?: CashbackType;
  cashback_value?: number;
  min_transaction?: number | null;
  max_cashback?: number | null;
  priority?: number;
  effective_until?: Date | null;
  is_active?: boolean;
}

// Cakupan (scope_type dan ketiga FK-nya) sengaja TIDAK bisa diubah di
// sini. Aturan yang berpindah dari satu produk ke produk lain akan membuat
// baris cashback_ledger lama menunjuk ke aturan yang tidak pernah
// membayarnya — sejarahnya jadi berbohong. Ganti cakupan = nonaktifkan
// yang lama, buat yang baru.
export async function updateCashbackRule(
  id: string,
  input: UpdateCashbackRuleInput,
  db: Queryable = pool,
): Promise<CashbackRule | null> {
  const assignments: string[] = [];
  const values: unknown[] = [id];

  function set(column: string, value: unknown) {
    if (value === undefined) return;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  set("cashback_type", input.cashback_type);
  set("cashback_value", input.cashback_value);
  set("min_transaction", input.min_transaction);
  set("max_cashback", input.max_cashback);
  set("priority", input.priority);
  set("effective_until", input.effective_until);
  set("is_active", input.is_active);

  if (assignments.length === 0) {
    return findCashbackRuleById(id, db);
  }

  const result = await db.query<CashbackRule>(
    `UPDATE cashback_rules SET ${assignments.join(", ")} WHERE id = $1 RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

// --- ledger --------------------------------------------------------------

export interface CreateCashbackLedgerInput {
  transaction_id: string;
  beneficiary_user_id: string;
  wallet_id: string;
  cashback_rule_id: string | null;
  amount: number;
}

// ON CONFLICT DO NOTHING pada transaction_id yang UNIQUE — bukan
// try/catch, dan bukan SELECT-lalu-INSERT.
//
// Ini pola yang persis sama dengan §5b dokumen terkunci: sebuah statement
// yang gagal di dalam withTransaction() yang sedang terbuka akan
// membatalkan SELURUH transaksi Postgres ("current transaction is
// aborted"), sehingga SELECT cadangan sesudahnya ikut gagal. DO NOTHING
// membuat percobaan kedua menjadi bukan-apa-apa yang tenang, bukan
// ledakan.
//
// `alreadyExisted` true berarti cashback untuk transaksi ini SUDAH pernah
// dibayar, dan pemanggilnya wajib berhenti tanpa menulis baris
// wallet_ledger — di situlah pembayaran ganda benar-benar dicegah.
export async function createCashbackLedgerEntry(
  input: CreateCashbackLedgerInput,
  client: PoolClient,
): Promise<{ entry: CashbackLedgerEntry | null; alreadyExisted: boolean }> {
  const result = await client.query<CashbackLedgerEntry>(
    `INSERT INTO cashback_ledger
       (transaction_id, beneficiary_user_id, wallet_id, cashback_rule_id, amount)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (transaction_id) DO NOTHING
     RETURNING *`,
    [
      input.transaction_id,
      input.beneficiary_user_id,
      input.wallet_id,
      input.cashback_rule_id,
      input.amount,
    ],
  );

  const entry = result.rows[0] ?? null;
  return { entry, alreadyExisted: entry === null };
}

export async function findCashbackByTransaction(
  transactionId: string,
  db: Queryable = pool,
): Promise<CashbackLedgerEntry | null> {
  const result = await db.query<CashbackLedgerEntry>(
    `SELECT * FROM cashback_ledger WHERE transaction_id = $1`,
    [transactionId],
  );
  return result.rows[0] ?? null;
}

export interface CashbackTotals {
  total_amount: string;
  entry_count: string;
}

export async function sumCashbackPaid(
  range: { from?: Date; to?: Date } = {},
  db: Queryable = pool,
): Promise<CashbackTotals> {
  const params: unknown[] = [];
  const conditions: string[] = [];
  if (range.from) {
    params.push(range.from);
    conditions.push(`created_at >= $${params.length}`);
  }
  if (range.to) {
    params.push(range.to);
    conditions.push(`created_at < $${params.length}`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await db.query<CashbackTotals>(
    `SELECT COALESCE(SUM(amount), 0)::text AS total_amount, COUNT(*)::text AS entry_count
     FROM cashback_ledger ${where}`,
    params,
  );
  return result.rows[0];
}

// --- panel admin -----------------------------------------------------------

export interface CashbackRuleWithTarget extends CashbackRule {
  /** Nama yang dibaca manusia untuk cakupannya — nama produk, brand, atau
   *  kategori. Null untuk GLOBAL. Admin memikirkan "Telkomsel 5.000",
   *  bukan sebuah uuid. */
  target_name: string | null;
  /** Hanya untuk cakupan PRODUK: harga modal saat ini, supaya daftar bisa
   *  langsung menunjukkan apakah cashback-nya masuk akal terhadap
   *  harganya. */
  product_base_price: string | null;
  /** Berapa kali aturan ini sudah benar-benar membayar, dan totalnya. */
  paid_count: string;
  paid_total: string;
}

export async function listCashbackRulesWithTargets(db: Queryable = pool): Promise<CashbackRuleWithTarget[]> {
  const result = await db.query<CashbackRuleWithTarget>(
    `SELECT r.*,
            COALESCE(p.product_name, b.name, COALESCE(c.display_name, c.name)) AS target_name,
            p.base_price::text AS product_base_price,
            COUNT(l.id)::text AS paid_count,
            COALESCE(SUM(l.amount), 0)::text AS paid_total
     FROM cashback_rules r
     LEFT JOIN products p ON p.id = r.product_id
     LEFT JOIN brands b ON b.id = r.brand_id
     LEFT JOIN categories c ON c.id = r.category_id
     LEFT JOIN cashback_ledger l ON l.cashback_rule_id = r.id
     GROUP BY r.id, p.product_name, p.base_price, b.name, c.display_name, c.name
     ORDER BY r.is_active DESC, r.created_at DESC`,
  );
  return result.rows;
}

export interface CashbackProductOption {
  id: string;
  product_name: string;
  base_price: string;
  category_name: string | null;
  brand_name: string | null;
}

// Semua produk yang bisa dibeli, untuk pemilih produk di formulir. Tanpa
// paginasi dengan sengaja: katalognya ratusan baris, bukan ribuan, dan
// pemilih yang harus berpindah halaman untuk menemukan "Telkomsel 5.000"
// adalah pemilih yang tidak dipakai.
export async function listCashbackProductOptions(db: Queryable = pool): Promise<CashbackProductOption[]> {
  const result = await db.query<CashbackProductOption>(
    `SELECT p.id, p.product_name, p.base_price::text AS base_price,
            COALESCE(c.display_name, c.name) AS category_name, b.name AS brand_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     WHERE p.admin_disabled = false
     ORDER BY COALESCE(c.display_name, c.name) NULLS LAST, b.name NULLS LAST, p.base_price ASC`,
  );
  return result.rows;
}
