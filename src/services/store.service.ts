import { withTransaction } from "@/lib/db/transaction";
import { createStore, findStoreByOwnerUserId, findStoreById, verifyStore as verifyStoreRow } from "@/repositories/store.repository";
import { provisionWalletForAccount, findWalletByOwner } from "@/repositories/wallet.repository";
import { recordAuditLog } from "@/repositories/audit.repository";
import type { Wallet } from "@/types/wallet";
import type { Store } from "@/types/store";

// PRD Digides Toko §7 contract (see wallet.repository.ts's findWalletByOwner
// and wallet.service.ts's getWalletForMitraSession): the one, dedicated way
// to resolve a store's own wallet. Never fold this into
// getWalletForMitraSession — a store's wallet is never "the current
// session's own wallet" even when the caller is that store's owner.
export async function getWalletForStore(storeId: string): Promise<Wallet | null> {
  return findWalletByOwner("STORE", storeId);
}

export interface RegisterStoreInput {
  ownerUserId: string;
  name: string;
  provinceCode?: string | null;
  regencyCode?: string | null;
  districtCode?: string | null;
  villageCode?: string | null;
  addressDetail?: string | null;
}

// Tahap 2 (PRD Digides Toko §9): creates the store row and its Rp0 wallet
// together, in one DB transaction, so a partial failure never leaves a
// store without a wallet. One store per owner (044_stores.sql's UNIQUE
// owner_user_id) — checked here first for a friendly error message, with
// the UNIQUE constraint as the real, race-proof guarantee underneath.
export async function registerStore(input: RegisterStoreInput): Promise<{ store: Store; wallet: Wallet }> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Nama toko wajib diisi");
  }

  const existing = await findStoreByOwnerUserId(input.ownerUserId);
  if (existing) {
    throw new Error("Anda sudah memiliki toko terdaftar");
  }

  return withTransaction(async (client) => {
    const store = await createStore(
      {
        owner_user_id: input.ownerUserId,
        name,
        province_code: input.provinceCode ?? null,
        regency_code: input.regencyCode ?? null,
        district_code: input.districtCode ?? null,
        village_code: input.villageCode ?? null,
        address_detail: input.addressDetail ?? null,
      },
      client,
    );

    const { wallet } = await provisionWalletForAccount({ account_type: "STORE", store_id: store.id }, client);

    await recordAuditLog(
      {
        actor_user_id: input.ownerUserId,
        action: "STORE_REGISTERED",
        entity: "stores",
        entity_id: store.id,
        new_value: { name: store.name, owner_user_id: input.ownerUserId },
      },
      client,
    );

    return { store, wallet };
  });
}

export async function getMyStore(ownerUserId: string): Promise<Store | null> {
  return findStoreByOwnerUserId(ownerUserId);
}

// Super Admin action: SUBMITTED -> ACTIVE. Returns null if the store
// doesn't exist or isn't in SUBMITTED status (already verified, or somehow
// still DRAFT) — verifyStoreRow's own WHERE clause is the actual guard
// against double-verifying, this null check just turns that into a clean
// "nothing to do" instead of silently succeeding on a no-op UPDATE.
export async function verifyStore(storeId: string, verifiedByUserId: string): Promise<Store> {
  const store = await findStoreById(storeId);
  if (!store) {
    throw new Error("Toko tidak ditemukan");
  }
  const verified = await verifyStoreRow(storeId, verifiedByUserId);
  if (!verified) {
    throw new Error(`Toko berstatus ${store.status}, tidak bisa diverifikasi`);
  }

  await recordAuditLog({
    actor_user_id: verifiedByUserId,
    action: "STORE_VERIFIED",
    entity: "stores",
    entity_id: storeId,
    new_value: { status: "ACTIVE" },
  });

  return verified;
}
