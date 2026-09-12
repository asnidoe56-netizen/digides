export type CatalogStatus = "ACTIVE" | "DISABLED";
export type ProductStatus = "ACTIVE" | "DISABLED" | "GANGGUAN";
export type MerchandisingTag = "SUPER_MURAH" | "PROMO" | "TERLARIS";

/** Prabayar (pulsa, token, voucher — harga tetap, dibeli sekali jadi) vs
 *  pascabayar (tagihan — nominalnya baru diketahui setelah cek tagihan).
 *  Keduanya hidup di tabel yang sama tapi tidak boleh pernah bercampur di
 *  layar mitra; lihat PRD Pascabayar §7.9 dan migrasi 057. */
export type ProductType = "PREPAID" | "POSTPAID";

export interface Category {
  id: string;
  name: string;
  product_type: ProductType;
  // Admin-facing label shown to end users instead of `name` (e.g. "Isi
  // Pulsa" for the "Pulsa" category) — null means no custom label is set
  // yet, so callers should fall back to `name`. Kept separate from `name`
  // so renaming the display label never breaks Digiflazz catalog-sync's
  // matching, which relies on `name` staying exactly what Digiflazz sends.
  display_name: string | null;
  status: CatalogStatus;
}

export interface Brand {
  id: string;
  name: string;
  product_type: ProductType;
  status: CatalogStatus;
}

export interface Product {
  id: string;
  sku: string;
  product_name: string;
  category_id: string | null;
  brand_id: string | null;
  product_type: ProductType;
  /** Prabayar: harga modal dari Digiflazz. Pascabayar: selalu 0 — nominalnya
   *  baru diketahui saat cek tagihan (PRD Pascabayar §6.1). */
  base_price: string;
  /** Pascabayar saja: biaya admin yang ditagihkan ke pelanggan, dari
   *  price-list Digiflazz. NULL untuk prabayar. */
  admin_fee: string | null;
  /** Pascabayar saja: komisi Digiflazz, yaitu keuntungan Digides per
   *  transaksi sebelum biaya layanan tambahan. NULL untuk prabayar. */
  provider_commission: string | null;
  status: ProductStatus;
  /** Super Admin's own on/off switch, independent of `status` (which
   *  Digiflazz's catalog sync owns and can overwrite at any time). Lets an
   *  admin turn a product off without needing Digiflazz to do it. */
  admin_disabled: boolean;
  /** Purely a storefront label (Super Murah/Promo/Terlaris) — no bearing
   *  on whether the product can actually be purchased. */
  merchandising_tag: MerchandisingTag | null;
  /** Digiflazz's own `type` field from the price-list (e.g. "Umum", "Cek
   *  Nama", "Kuota") — null for anything synced before this column
   *  existed, or not synced from Digiflazz at all. See
   *  isNameVerificationProduct() in pricing.service.ts for the one place
   *  this currently matters: telling an E-Money "Cek Nama Pengguna
   *  <Brand>" inquiry SKU apart from a real purchasable top-up. */
  provider_type: string | null;
  provider: string;
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CatalogSyncLog {
  id: string;
  started_at: Date;
  finished_at: Date | null;
  received_count: number;
  inserted_count: number;
  updated_count: number;
  disabled_count: number;
  error_count: number;
  errors: unknown | null;
}

export type DigiflazzMode = "development" | "production";

export interface DigiflazzSettings {
  id: string;
  mode: DigiflazzMode;
  username: string;
  dev_key_encrypted: string | null;
  prod_key_encrypted: string | null;
  webhook_secret_encrypted: string | null;
  base_url: string;
  is_active: boolean;
  updated_at: Date;
}

export type MarkupScopeType = "GLOBAL" | "CATEGORY" | "BRAND" | "PRODUCT";
export type MarkupOwnerType = "MASTER" | "BUMDES" | "KONTER";
export type MarkupType = "NOMINAL" | "PERCENTAGE";

export interface MarkupRule {
  id: string;
  scope_type: MarkupScopeType;
  category_id: string | null;
  brand_id: string | null;
  product_id: string | null;
  owner_type: MarkupOwnerType;
  bumdes_id: string | null;
  konter_id: string | null;
  markup_type: MarkupType;
  markup_value: string;
  priority: number;
  effective_from: Date;
  effective_until: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
