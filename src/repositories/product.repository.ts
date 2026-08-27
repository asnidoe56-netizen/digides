import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type {
  Brand,
  CatalogStatus,
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

export async function findCategoryById(id: string, db: Queryable = pool): Promise<Category | null> {
  const result = await db.query<Category>(`SELECT * FROM categories WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

// Manual creation from the Kategori menu — fails on a duplicate name
// (UNIQUE violation surfaces as a thrown error) instead of upsertCategory's
// silent "update the existing row" behavior, since catalog-sync's
// upsert-by-name semantics don't apply to an admin explicitly adding one.
export async function createCategory(name: string, db: Queryable = pool): Promise<Category> {
  const result = await db.query<Category>(`INSERT INTO categories (name) VALUES ($1) RETURNING *`, [name]);
  return result.rows[0];
}

export async function renameCategory(id: string, name: string, db: Queryable = pool): Promise<Category | null> {
  const result = await db.query<Category>(`UPDATE categories SET name = $2 WHERE id = $1 RETURNING *`, [id, name]);
  return result.rows[0] ?? null;
}

export async function updateCategoryStatus(
  id: string,
  status: CatalogStatus,
  db: Queryable = pool,
): Promise<Category | null> {
  const result = await db.query<Category>(`UPDATE categories SET status = $2 WHERE id = $1 RETURNING *`, [
    id,
    status,
  ]);
  return result.rows[0] ?? null;
}

export interface CategoryWithProductCount extends Category {
  product_count: number;
}

// One query for the Kategori menu's list — avoids an N+1 COUNT per row.
export async function listCategoriesWithProductCount(db: Queryable = pool): Promise<CategoryWithProductCount[]> {
  const result = await db.query<CategoryWithProductCount>(
    `SELECT c.*, COUNT(p.id)::int AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id
     ORDER BY c.name ASC`,
  );
  return result.rows;
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

export async function findBrandById(id: string, db: Queryable = pool): Promise<Brand | null> {
  const result = await db.query<Brand>(`SELECT * FROM brands WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

// Manual creation from the Brand menu — fails on a duplicate name (UNIQUE
// violation surfaces as a thrown error) instead of upsertBrand's silent
// "update the existing row" behavior, same reasoning as createCategory.
export async function createBrand(name: string, db: Queryable = pool): Promise<Brand> {
  const result = await db.query<Brand>(`INSERT INTO brands (name) VALUES ($1) RETURNING *`, [name]);
  return result.rows[0];
}

export async function renameBrand(id: string, name: string, db: Queryable = pool): Promise<Brand | null> {
  const result = await db.query<Brand>(`UPDATE brands SET name = $2 WHERE id = $1 RETURNING *`, [id, name]);
  return result.rows[0] ?? null;
}

export async function updateBrandStatus(
  id: string,
  status: CatalogStatus,
  db: Queryable = pool,
): Promise<Brand | null> {
  const result = await db.query<Brand>(`UPDATE brands SET status = $2 WHERE id = $1 RETURNING *`, [id, status]);
  return result.rows[0] ?? null;
}

export interface CategoryBrandPair {
  category_id: string;
  brand_id: string;
}

// Which brands actually have products under which category — e.g. Pulsa ->
// [TELKOMSEL, INDOSAT, ...]. Lets the Produk filter narrow its Provider
// dropdown to only what's relevant once a category is picked, instead of
// always listing every brand across every category.
export async function listCategoryBrandPairs(db: Queryable = pool): Promise<CategoryBrandPair[]> {
  const result = await db.query<CategoryBrandPair>(
    `SELECT DISTINCT category_id, brand_id FROM products
     WHERE category_id IS NOT NULL AND brand_id IS NOT NULL`,
  );
  return result.rows;
}

export interface BrandWithProductCount extends Brand {
  product_count: number;
}

// One query for the Brand menu's list — avoids an N+1 COUNT per row.
export async function listBrandsWithProductCount(db: Queryable = pool): Promise<BrandWithProductCount[]> {
  const result = await db.query<BrandWithProductCount>(
    `SELECT b.*, COUNT(p.id)::int AS product_count
     FROM brands b
     LEFT JOIN products p ON p.brand_id = b.id
     GROUP BY b.id
     ORDER BY b.name ASC`,
  );
  return result.rows;
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

  // Ascending by nominal (base_price) — e.g. Pulsa 5.000 before 10.000 —
  // rather than alphabetical by name, per the Produk page's sort order.
  // product_name is only a tiebreaker for products that share a price.
  const result = await db.query<Product>(
    `SELECT * FROM products ${where}
     ORDER BY base_price ASC, product_name ASC
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
  /** Omit to leave the currently-stored encrypted secret untouched. */
  webhook_secret_encrypted?: string;
}

export async function upsertDigiflazzSettings(
  input: UpsertDigiflazzSettingsInput,
  db: Queryable = pool,
): Promise<DigiflazzSettings> {
  const existing = await getDigiflazzSettings(db);

  if (!existing) {
    const result = await db.query<DigiflazzSettings>(
      `INSERT INTO digiflazz_settings (username, base_url, mode, dev_key_encrypted, prod_key_encrypted, webhook_secret_encrypted, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [
        input.username,
        input.base_url,
        input.mode,
        input.dev_key_encrypted ?? null,
        input.prod_key_encrypted ?? null,
        input.webhook_secret_encrypted ?? null,
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
         prod_key_encrypted = COALESCE($6, prod_key_encrypted),
         webhook_secret_encrypted = COALESCE($7, webhook_secret_encrypted)
     WHERE id = $1
     RETURNING *`,
    [
      existing.id,
      input.username,
      input.base_url,
      input.mode,
      input.dev_key_encrypted ?? null,
      input.prod_key_encrypted ?? null,
      input.webhook_secret_encrypted ?? null,
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

export interface CategoryMarkup {
  category_id: string;
  category_name: string;
  markup_rule_id: string | null;
  /** "0" when the category has no active MASTER/CATEGORY rule yet. */
  markup_value: string;
}

// The single list the Markup page and the Products catalog both need: one
// row per category, left-joined to its active MASTER-owned, NOMINAL,
// CATEGORY-scope markup rule (at most one, enforced by
// markup_rules_master_category_active_uidx). Categories without a rule
// yet still appear, with markup_value coalesced to 0.
export async function listCategoryMarkups(db: Queryable = pool): Promise<CategoryMarkup[]> {
  const result = await db.query<CategoryMarkup>(
    `SELECT
       c.id AS category_id,
       c.name AS category_name,
       mr.id AS markup_rule_id,
       COALESCE(mr.markup_value, 0) AS markup_value
     FROM categories c
     LEFT JOIN markup_rules mr
       ON mr.category_id = c.id
      AND mr.scope_type = 'CATEGORY'
      AND mr.owner_type = 'MASTER'
      AND mr.is_active = true
     ORDER BY c.name ASC`,
  );
  return result.rows;
}

// Single-category lookup for the Transaction Engine's selling-price
// calculation — avoids fetching every category just to price one product.
export async function getCategoryMarkupValue(categoryId: string | null, db: Queryable = pool): Promise<string> {
  if (!categoryId) return "0";
  const result = await db.query<{ markup_value: string }>(
    `SELECT COALESCE(markup_value, 0) AS markup_value FROM markup_rules
     WHERE category_id = $1 AND scope_type = 'CATEGORY' AND owner_type = 'MASTER' AND is_active = true`,
    [categoryId],
  );
  return result.rows[0]?.markup_value ?? "0";
}

// Sets the one active MASTER/CATEGORY markup rule for a category — always
// NOMINAL (Rupiah), per the Markup menu's scope. Relies on
// markup_rules_master_category_active_uidx as the ON CONFLICT target so
// this is a single atomic upsert, not a read-then-write.
export async function upsertCategoryMarkup(
  categoryId: string,
  markupValue: string | number,
  db: Queryable = pool,
): Promise<MarkupRule> {
  const result = await db.query<MarkupRule>(
    `INSERT INTO markup_rules (scope_type, category_id, owner_type, markup_type, markup_value)
     VALUES ('CATEGORY', $1, 'MASTER', 'NOMINAL', $2)
     ON CONFLICT (category_id) WHERE scope_type = 'CATEGORY' AND owner_type = 'MASTER' AND is_active = true
     DO UPDATE SET markup_value = EXCLUDED.markup_value
     RETURNING *`,
    [categoryId, markupValue],
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
