import { findStoreByOwnerUserId } from "@/repositories/store.repository";
import { createStoreProduct, listStoreProductsByStore } from "@/repositories/store-product.repository";
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
