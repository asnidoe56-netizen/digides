export type CatalogStatus = "ACTIVE" | "DISABLED";
export type ProductStatus = "ACTIVE" | "DISABLED" | "GANGGUAN";

export interface Category {
  id: string;
  name: string;
  status: CatalogStatus;
}

export interface Brand {
  id: string;
  name: string;
  status: CatalogStatus;
}

export interface Product {
  id: string;
  sku: string;
  product_name: string;
  category_id: string | null;
  brand_id: string | null;
  base_price: string;
  status: ProductStatus;
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
