import { withTransaction } from "@/lib/db/transaction";
import { findStoreByOwnerUserId } from "@/repositories/store.repository";
import {
  createStoreProduct,
  findStoreProductByBarcode,
  listStoreProductsByStore,
  updateStoreProduct,
  adjustStoreProductStock,
} from "@/repositories/store-product.repository";
import { findStoreProductCategoryById } from "@/repositories/store-product-category.repository";
import type { StoreProduct } from "@/types/store-product";

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}

// A barcode is whatever the scanner read, with surrounding whitespace
// removed — never reformatted, never re-encoded, never checksum-validated.
// Warungs stock plenty of goods whose printed codes are not valid EAN-13
// (imported snacks, locally repacked items, a shop's own printed labels),
// and rejecting those would push the owner back to typing. An empty string
// becomes null so "cleared the field" and "never filled it" are the same
// state in the database rather than two states the reports must handle.
function normaliseBarcode(barcode: string | null | undefined): string | null | undefined {
  if (barcode === undefined) return undefined;
  if (barcode === null) return null;
  const trimmed = barcode.trim();
  return trimmed === "" ? null : trimmed;
}

// PRD Kasir Pintar §6.6. Modal is the shopkeeper's own bookkeeping figure
// and nothing more: it is validated as a plain rupiah amount and stored.
// Zero is allowed, because a genuinely free item (a sample, a giveaway) is
// a real thing; null means "not filled in", which the profit report states
// as such rather than reporting Rp0 profit (§10).
function assertValidCostPrice(costPrice: number | null | undefined) {
  if (costPrice === undefined || costPrice === null) return;
  if (!Number.isInteger(costPrice) || costPrice < 0) {
    throw new Error("Modal produk tidak valid");
  }
}

// The category must come from the shared fixed list (§6.2) and must still
// be ACTIVE — a category retired by a later migration should stop being
// assignable without invalidating the products already filed under it.
async function assertValidCategory(categoryId: string | null | undefined) {
  if (categoryId === undefined || categoryId === null) return;
  const category = await findStoreProductCategoryById(categoryId);
  if (!category || category.status !== "ACTIVE") {
    throw new Error("Kategori produk tidak dikenal");
  }
}

export interface CreateMyStoreProductInput {
  ownerUserId: string;
  name: string;
  price: number;
  stock: number;
  barcode?: string | null;
  categoryId?: string | null;
  costPrice?: number | null;
}

// Product creation doesn't require the store to be ACTIVE yet — a SUBMITTED
// store's owner can prepare their catalog while waiting for verification,
// unlike creating an order/payment request (store-payment.service.ts),
// which does require ACTIVE since that's the step that actually moves
// money.
export async function createMyStoreProduct(input: CreateMyStoreProductInput): Promise<StoreProduct> {
  const store = await findStoreByOwnerUserId(input.ownerUserId);
  if (!store) {
    throw new Error("Anda belum memiliki toko terdaftar");
  }
  if (!Number.isInteger(input.price) || input.price <= 0) {
    throw new Error("Harga produk tidak valid");
  }
  if (!Number.isInteger(input.stock) || input.stock < 0) {
    throw new Error("Stok produk tidak valid");
  }
  const name = input.name.trim();
  if (!name) {
    throw new Error("Nama produk wajib diisi");
  }
  assertValidCostPrice(input.costPrice);
  await assertValidCategory(input.categoryId);

  try {
    return await createStoreProduct({
      store_id: store.id,
      name,
      price: input.price,
      stock: input.stock,
      barcode: normaliseBarcode(input.barcode) ?? null,
      category_id: input.categoryId ?? null,
      cost_price: input.costPrice ?? null,
    });
  } catch (error) {
    // store_products_store_barcode_unique_idx — the owner already has a
    // product under this barcode. Said plainly, because the cashier flow
    // deliberately offers "Tambah produk baru?" on an unknown scan, and a
    // race or a stale screen can land here.
    if (isUniqueViolation(error)) {
      throw new Error("Barcode ini sudah dipakai produk lain di toko Anda");
    }
    throw error;
  }
}

export async function listMyStoreProducts(ownerUserId: string): Promise<StoreProduct[]> {
  const store = await findStoreByOwnerUserId(ownerUserId);
  if (!store) {
    throw new Error("Anda belum memiliki toko terdaftar");
  }
  return listStoreProductsByStore(store.id);
}

// The scan lookup (PRD Kasir Pintar §5). Returns null for an unknown
// barcode rather than throwing: "not found" is the ordinary case that
// drives the "Tambah produk baru?" offer, not an error.
export async function findMyStoreProductByBarcode(
  ownerUserId: string,
  barcode: string,
): Promise<StoreProduct | null> {
  const store = await findStoreByOwnerUserId(ownerUserId);
  if (!store) {
    throw new Error("Anda belum memiliki toko terdaftar");
  }
  const normalised = normaliseBarcode(barcode);
  if (!normalised) {
    throw new Error("Barcode tidak valid");
  }
  return findStoreProductByBarcode(store.id, normalised);
}

export interface UpdateMyStoreProductInput {
  ownerUserId: string;
  productId: string;
  name?: string;
  price?: number;
  isActive?: boolean;
  /** null clears the field; undefined leaves it unchanged. */
  barcode?: string | null;
  categoryId?: string | null;
  costPrice?: number | null;
}

// Price/name/aktif-nonaktif plus barcode, kategori and modal. A price or
// modal change never rewrites an existing order: store_order_items keeps
// both copied at checkout time (047_store_orders.sql for unit_price,
// 053_store_product_cost.sql for unit_cost), so re-pricing is always safe
// to do even while a payment request is still open — and yesterday's
// profit stays exactly what it was (§6.5).
export async function updateMyStoreProduct(input: UpdateMyStoreProductInput): Promise<StoreProduct> {
  const store = await findStoreByOwnerUserId(input.ownerUserId);
  if (!store) {
    throw new Error("Anda belum memiliki toko terdaftar");
  }
  if (input.price !== undefined && (!Number.isInteger(input.price) || input.price <= 0)) {
    throw new Error("Harga produk tidak valid");
  }
  const name = input.name?.trim();
  if (input.name !== undefined && !name) {
    throw new Error("Nama produk wajib diisi");
  }
  assertValidCostPrice(input.costPrice);
  await assertValidCategory(input.categoryId);

  try {
    const updated = await updateStoreProduct(input.productId, store.id, {
      name,
      price: input.price,
      is_active: input.isActive,
      barcode: normaliseBarcode(input.barcode),
      category_id: input.categoryId,
      cost_price: input.costPrice,
    });
    if (!updated) {
      throw new Error("Produk tidak ditemukan di toko Anda");
    }
    return updated;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("Barcode ini sudah dipakai produk lain di toko Anda");
    }
    throw error;
  }
}

export interface AdjustMyStoreProductStockInput {
  ownerUserId: string;
  productId: string;
  /** Signed — positive restocks, negative corrects shrinkage. */
  delta: number;
}

// The restock path missing until Tahap 3.5 (PRD §9c): stock could only
// ever go down through sales, so a warung that sold out could never sell
// that product again.
export async function adjustMyStoreProductStock(
  input: AdjustMyStoreProductStockInput,
): Promise<StoreProduct> {
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    throw new Error("Perubahan stok tidak valid");
  }
  const store = await findStoreByOwnerUserId(input.ownerUserId);
  if (!store) {
    throw new Error("Anda belum memiliki toko terdaftar");
  }

  return withTransaction(async (client) => {
    const updated = await adjustStoreProductStock(
      input.productId,
      store.id,
      input.delta,
      input.ownerUserId,
      client,
    );
    if (!updated) {
      // Either the product isn't this store's, or a negative delta would
      // take stock below zero — adjustStoreProductStock's guarded UPDATE
      // deliberately doesn't distinguish, so neither does this message.
      throw new Error("Produk tidak ditemukan di toko Anda, atau stok tidak mencukupi untuk pengurangan ini");
    }
    return updated;
  });
}
