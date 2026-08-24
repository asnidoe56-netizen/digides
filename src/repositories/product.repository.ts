import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type {
  Brand,
  CatalogSyncLog,
  Category,
  DigiflazzMode,
  DigiflazzSettings,
  MarkupRule,
  MarkupOwnerType,
  Product,
  ProductStatus,
} from "@/types/product";

export async function upsertCategory(name: string, db: Queryable = pool): Promise<Category> {
  const result = await db.query<Category>(
    `INSERT INTO categories (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [name],
  );
  return result.rows[0];
}

export async function upsertBrand(name: string, db: Queryable = pool): Promise<Brand> {
  const result = await db.query<Brand>(
    `INSERT INTO brands (name) VALUES ($1)
     ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [name],
  );
  return result.rows[0];
}

export interface UpsertProductInput {
  sku: string;
  product_name: string;
  category_id: string | null;
  brand_id: string | null;
  base_price: string | number;
  status: ProductStatus;
  provider?: string;
}

// Used by the catalog-sync job: one row per SKU from the provider
// price-list, inserted on first sight and refreshed on every subsequent
// sync (base_price/status/last_synced_at kept current).
export async function upsertProduct(input: UpsertProductInput, db: Queryable = pool): Promise<Product> {
  const result = await db.query<Product>(
    `INSERT INTO products (sku, product_name, category_id, brand_id, base_price, status, provider, last_synced_at)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'digiflazz'), now())
     ON CONFLICT (sku) DO UPDATE SET
       product_name = EXCLUDED.product_name,
       category_id = EXCLUDED.category_id,
       brand_id = EXCLUDED.brand_id,
       base_price = EXCLUDED.base_price,
       status = EXCLUDED.status,
       last_synced_at = now()
     RETURNING *`,
    [
      input.sku,
      input.product_name,
      input.category_id,
      input.brand_id,
      input.base_price,
      input.status,
      input.provider ?? null,
    ],
  );
  return result.rows[0];
}

export async function findProductBySku(sku: string, db: Queryable = pool): Promise<Product | null> {
  const result = await db.query<Product>(`SELECT * FROM products WHERE sku = $1`, [sku]);
  return result.rows[0] ?? null;
}

export async function findProductById(id: string, db: Queryable = pool): Promise<Product | null> {
  const result = await db.query<Product>(`SELECT * FROM products WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export interface ListProductsFilter {
  status?: ProductStatus;
  categoryId?: string;
  brandId?: string;
  /** Matches against product_name or sku, case-insensitive. */
  search?: string;
  limit?: number;
  offset?: number;
}

function buildProductFilterConditions(filter: ListProductsFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.status) {
    params.push(filter.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filter.categoryId) {
    params.push(filter.categoryId);
    conditions.push(`category_id = $${params.length}`);
  }
  if (filter.brandId) {
    params.push(filter.brandId);
    conditions.push(`brand_id = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    conditions.push(`(product_name ILIKE $${params.length} OR sku ILIKE $${params.length})`);
  }

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

export async function listProducts(
  filter: ListProductsFilter = {},
  db: Queryable = pool,
): Promise<Product[]> {
  const { where, params } = buildProductFilterConditions(filter);

  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<Product>(
    `SELECT * FROM products ${where}
     ORDER BY product_name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countProducts(
  filter: ListProductsFilter = {},
  db: Queryable = pool,
): Promise<number> {
  const { where, params } = buildProductFilterConditions(filter);
  const result = await db.query<{ count: string }>(`SELECT COUNT(*) FROM products ${where}`, params);
  return Number(result.rows[0].count);
}

export async function listCategories(db: Queryable = pool): Promise<Category[]> {
  const result = await db.query<Category>(`SELECT * FROM categories ORDER BY name ASC`);
  return result.rows;
}

export async function listBrands(db: Queryable = pool): Promise<Brand[]> {
  const result = await db.query<Brand>(`SELECT * FROM brands ORDER BY name ASC`);
  return result.rows;
}

export async function startCatalogSyncLog(db: Queryable = pool): Promise<CatalogSyncLog> {
  const result = await db.query<CatalogSyncLog>(
    `INSERT INTO catalog_sync_logs DEFAULT VALUES RETURNING *`,
  );
  return result.rows[0];
}

export interface FinishCatalogSyncLogInput {
  received_count: number;
  inserted_count: number;
  updated_count: number;
  disabled_count: number;
  error_count: number;
  errors?: unknown;
}

export async function finishCatalogSyncLog(
  id: string,
  input: FinishCatalogSyncLogInput,
  db: Queryable = pool,
): Promise<CatalogSyncLog> {
  const result = await db.query<CatalogSyncLog>(
    `UPDATE catalog_sync_logs
     SET finished_at = now(), received_count = $2, inserted_count = $3,
         updated_count = $4, disabled_count = $5, error_count = $6, errors = $7
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.received_count,
      input.inserted_count,
      input.updated_count,
      input.disabled_count,
      input.error_count,
      input.errors ? JSON.stringify(input.errors) : null,
    ],
  );
  return result.rows[0];
}

// digiflazz_settings is a singleton — one row holds the account's
// username, both dev and prod keys (still encrypted here), and a `mode`
// column saying which key is currently in effect. This lets the Settings
// UI be a single form ("username, dev key, prod key, which one is
// active") instead of one row per mode. Callers must decrypt
// `dev_key_encrypted`/`prod_key_encrypted` server-side before use, and
// this raw row must never be returned from an API route as-is.
export async function getDigiflazzSettings(db: Queryable = pool): Promise<DigiflazzSettings | null> {
  const result = await db.query<DigiflazzSettings>(
    `SELECT * FROM digiflazz_settings ORDER BY updated_at DESC LIMIT 1`,
  );
  return result.rows[0] ?? null;
}

export interface UpsertDigiflazzSettingsInput {
  username: string;
  base_url: string;
  mode: DigiflazzMode;
  /** Omit to leave the currently-stored encrypted key untouched. */
  dev_key_encrypted?: string;
  /** Omit to leave the currently-stored encrypted key untouched. */
  prod_key_encrypted?: string;
}

export async function upsertDigiflazzSettings(
  input: UpsertDigiflazzSettingsInput,
  db: Queryable = pool,
): Promise<DigiflazzSettings> {
  const existing = await getDigiflazzSettings(db);

  if (!existing) {
    const result = await db.query<DigiflazzSettings>(
      `INSERT INTO digiflazz_settings (username, base_url, mode, dev_key_encrypted, prod_key_encrypted, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING *`,
      [
        input.username,
        input.base_url,
        input.mode,
        input.dev_key_encrypted ?? null,
        input.prod_key_encrypted ?? null,
      ],
    );
    return result.rows[0];
  }

  const result = await db.query<DigiflazzSettings>(
    `UPDATE digiflazz_settings
     SET username = $2,
         base_url = $3,
         mode = $4,
         dev_key_encrypted = COALESCE($5, dev_key_encrypted),
         prod_key_encrypted = COALESCE($6, prod_key_encrypted)
     WHERE id = $1
     RETURNING *`,
    [
      existing.id,
      input.username,
      input.base_url,
      input.mode,
      input.dev_key_encrypted ?? null,
      input.prod_key_encrypted ?? null,
    ],
  );
  return result.rows[0];
}

export interface CreateMarkupRuleInput {
  scope_type: "GLOBAL" | "CATEGORY" | "BRAND" | "PRODUCT";
  category_id?: string | null;
  brand_id?: string | null;
  product_id?: string | null;
  owner_type: MarkupOwnerType;
  bumdes_id?: string | null;
  konter_id?: string | null;
  markup_type: "NOMINAL" | "PERCENTAGE";
  markup_value: string | number;
  priority?: number;
  effective_from?: Date;
  effective_until?: Date | null;
}

export async function createMarkupRule(input: CreateMarkupRuleInput, db: Queryable = pool): Promise<MarkupRule> {
  const result = await db.query<MarkupRule>(
    `INSERT INTO markup_rules (
       scope_type, category_id, brand_id, product_id,
       owner_type, bumdes_id, konter_id,
       markup_type, markup_value, priority, effective_from, effective_until
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11, now()), $12)
     RETURNING *`,
    [
      input.scope_type,
      input.category_id ?? null,
      input.brand_id ?? null,
      input.product_id ?? null,
      input.owner_type,
      input.bumdes_id ?? null,
      input.konter_id ?? null,
      input.markup_type,
      input.markup_value,
      input.priority ?? 0,
      input.effective_from ?? null,
      input.effective_until ?? null,
    ],
  );
  return result.rows[0];
}

// Every markup rule that could apply to `productId` for the given owner,
// most specific scope first (PRODUCT > BRAND > CATEGORY > GLOBAL) — the
// pricing engine walks this list and applies each rule in order.
export async function listApplicableMarkupRules(
  params: { productId: string; categoryId: string | null; brandId: string | null },
  db: Queryable = pool,
): Promise<MarkupRule[]> {
  const result = await db.query<MarkupRule>(
    `SELECT * FROM markup_rules
     WHERE is_active = true
       AND effective_from <= now()
       AND (effective_until IS NULL OR effective_until > now())
       AND (
         (scope_type = 'PRODUCT' AND product_id = $1) OR
         (scope_type = 'BRAND' AND brand_id = $2) OR
         (scope_type = 'CATEGORY' AND category_id = $3) OR
         (scope_type = 'GLOBAL')
       )
     ORDER BY
       CASE scope_type
         WHEN 'PRODUCT' THEN 0
         WHEN 'BRAND' THEN 1
         WHEN 'CATEGORY' THEN 2
         ELSE 3
       END,
       priority DESC`,
    [params.productId, params.brandId, params.categoryId],
  );
  return result.rows;
}
