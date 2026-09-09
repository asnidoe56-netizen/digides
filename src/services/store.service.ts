import { withTransaction } from "@/lib/db/transaction";
import {
  createStore,
  createStoreSettlement,
  findStoreByOwnerUserId,
  findStoreById,
  setStoreStatus,
  verifyStore as verifyStoreRow,
} from "@/repositories/store.repository";
import { provisionWalletForAccount, findWalletByOwner, postLedgerEntry } from "@/repositories/wallet.repository";
import { recordAuditLog } from "@/repositories/audit.repository";
import { verifyTransactionPin } from "@/services/auth.service";
import { getWalletForMitraSession } from "@/services/wallet.service";
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

export interface SettleStoreBalanceInput {
  ownerUserId: string;
  ownerRoles: string[];
  /** Rupiah, a positive whole number. */
  amount: number;
  pin: string;
  /** Client-generated, same role as a purchase's own: a retried request
   *  (double-tap, a timed-out request the app resubmits) with the same key
   *  is a safe no-op, never a second move. */
  idempotencyKey: string;
}

// "Pindahkan ke Saldo Utama" — a store owner moving their own store's
// balance into their own main/operating wallet, which since 2026-09-09 is
// the only way store money reaches a PPOB purchase.
//
// This is NOT a withdrawal and NOT a transfer: both wallets belong to the
// same person, and §6 rule 9's ban on a store wallet sending balance to
// another *user* is untouched — transferToDownline still resolves only
// through getWalletForMitraSession, which never returns a store wallet.
// The dedicated STORE_SETTLEMENT_* ledger types keep that distinction
// legible instead of hiding an internal move among peer transfers.
//
// Why it exists: the store's ledger should read as a shop's ledger. When
// store balance funded purchases directly, that ledger filled with
// RESERVE/DEBIT/RELEASE rows and backup-SKU noise, which would make the
// books unreadable once the cashier grows refunds, shifts and supplier
// purchases.
export async function settleStoreBalance(input: SettleStoreBalanceInput) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("Nominal pemindahan tidak valid");
  }

  await verifyTransactionPin(input.ownerUserId, input.pin);

  const store = await findStoreByOwnerUserId(input.ownerUserId);
  if (!store) {
    throw new Error("Anda belum memiliki toko terdaftar");
  }
  if (store.status !== "ACTIVE") {
    // A suspended store is not an unverified one — saying "belum
    // diverifikasi" to an owner whose store was suspended would send them
    // looking for a verification that already happened.
    throw new Error(
      store.status === "SUSPENDED"
        ? "Toko Anda sedang ditangguhkan, saldonya belum bisa dipindahkan"
        : "Toko Anda belum diverifikasi, saldonya belum bisa dipindahkan",
    );
  }

  const [storeWallet, destinationWallet] = await Promise.all([
    getWalletForStore(store.id),
    getWalletForMitraSession(input.ownerUserId, input.ownerRoles),
  ]);
  if (!storeWallet) {
    throw new Error("Wallet toko tidak ditemukan");
  }
  if (!destinationWallet) {
    throw new Error("Saldo utama Anda tidak ditemukan");
  }

  return withTransaction(async (client) => {
    // Claims the move before either ledger leg is posted, so a retry with
    // the same key returns the original result instead of moving twice.
    const { settlement, alreadyExisted } = await createStoreSettlement(
      {
        idempotency_key: input.idempotencyKey,
        store_id: store.id,
        store_wallet_id: storeWallet.id,
        destination_wallet_id: destinationWallet.id,
        amount: input.amount,
        created_by: input.ownerUserId,
      },
      client,
    );

    if (alreadyExisted) {
      return { settlementId: settlement.id, amount: input.amount, storeName: store.name };
    }

    await postLedgerEntry(client, {
      walletId: storeWallet.id,
      type: "STORE_SETTLEMENT_OUT",
      amount: input.amount,
      channel: "WEB",
      settlementId: settlement.id,
      reference: settlement.id,
      createdBy: input.ownerUserId,
    });

    await postLedgerEntry(client, {
      walletId: destinationWallet.id,
      type: "STORE_SETTLEMENT_IN",
      amount: input.amount,
      channel: "WEB",
      settlementId: settlement.id,
      reference: settlement.id,
      createdBy: input.ownerUserId,
    });

    await recordAuditLog(
      {
        actor_user_id: input.ownerUserId,
        action: "STORE_BALANCE_SETTLED",
        entity: "stores",
        entity_id: store.id,
        new_value: {
          amount: input.amount,
          store_wallet_id: storeWallet.id,
          destination_wallet_id: destinationWallet.id,
          settlement_id: settlement.id,
        },
      },
      client,
    );

    return { settlementId: settlement.id, amount: input.amount, storeName: store.name };
  });
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

// Super Admin: stop a store trading, or let it trade again. Suspending
// blocks the two things that move money — creating an order (kasir) and
// settling balance out — because both require an ACTIVE store; it never
// touches the balance already sitting in the store's wallet, and the
// owner can still read their own history.
export async function setStoreSuspension(
  storeId: string,
  suspend: boolean,
  actorUserId: string,
): Promise<Store> {
  const store = await findStoreById(storeId);
  if (!store) {
    throw new Error("Toko tidak ditemukan");
  }

  const from = suspend ? "ACTIVE" : "SUSPENDED";
  const to = suspend ? "SUSPENDED" : "ACTIVE";
  const updated = await setStoreStatus(storeId, from, to);
  if (!updated) {
    throw new Error(
      suspend
        ? `Toko berstatus ${store.status}, hanya toko aktif yang bisa ditangguhkan`
        : `Toko berstatus ${store.status}, hanya toko yang ditangguhkan yang bisa diaktifkan`,
    );
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: suspend ? "STORE_SUSPENDED" : "STORE_REACTIVATED",
    entity: "stores",
    entity_id: storeId,
    new_value: { status: to },
  });

  return updated;
}
