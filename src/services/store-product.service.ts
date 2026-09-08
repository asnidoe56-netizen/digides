import { withTransaction } from "@/lib/db/transaction";
import { findStoreByOwnerUserId } from "@/repositories/store.repository";
import {
  createStoreProduct,
  listStoreProductsByStore,
  updateStoreProduct,
  adjustStoreProductStock,
} from "@/repositories/store-product.repository";
import type { StoreProduct } from "@/types/store-product";

export interface CreateMyStoreProductInput {
  ownerUserId: string;
  name: string;
  price: number;
  stock: number;
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

  return createStoreProduct({ store_id: store.id, name, price: input.price, stock: input.stock });
}

export async function listMyStoreProducts(ownerUserId: string): Promise<StoreProduct[]> {
  const store = await findStoreByOwnerUserId(ownerUserId);
  if (!store) {
    throw new Error("Anda belum memiliki toko terdaftar");
  }
  return listStoreProductsByStore(store.id);
}

export interface UpdateMyStoreProductInput {
  ownerUserId: string;
  productId: string;
  name?: string;
  price?: number;
  isActive?: boolean;
}

// Price/name/aktif-nonaktif only. A price change never rewrites an
// existing order: store_order_items keeps the price copied at checkout
// time (047_store_orders.sql), so re-pricing is always safe to do even
// while a payment request is still open.
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

  const updated = await updateStoreProduct(input.productId, store.id, {
    name,
    price: input.price,
    is_active: input.isActive,
  });
  if (!updated) {
    throw new Error("Produk tidak ditemukan di toko Anda");
  }
  return updated;
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
