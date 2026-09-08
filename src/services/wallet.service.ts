import { withTransaction } from "@/lib/db/transaction";
import {
  postLedgerEntry,
  sumBalancesByOwnerType,
  sumHeldBalance,
  sumLedgerAmountByType,
  listLedgerGlobal,
  getWalletByBumdesId,
  getWalletByKonterId,
  findWalletByOwner,
  createWalletTransfer,
} from "@/repositories/wallet.repository";
import { findBumdesByAdminUserId } from "@/repositories/bumdes.repository";
import { findKonterByOperatorUserId } from "@/repositories/konter.repository";
import { recordAuditLog } from "@/repositories/audit.repository";
import { findRelationshipByReferredUser } from "@/repositories/referral.repository";
import { findUserById, listRolesForUser } from "@/repositories/user.repository";
import { verifyTransactionPin } from "@/services/auth.service";
import type { Wallet, WalletAccountType } from "@/types/wallet";

// Resolves any user's own OPERATING wallet from their id + roles — a
// BUMDES_ADMIN's and a KONTER's wallet live on their bumdes/konter entity,
// not directly on wallet_accounts.user_id, so those two need an extra
// lookup first; every other role (AFFILIATE, and any other plain
// USER-type account) resolves directly. Used both for "my own wallet"
// (Beranda, every purchase-flow price screen — always called with the
// current session's own id/roles there) and for "a downline's wallet"
// (Menu Mitra's masked-balance list — called once per downline with their
// own id/roles).
//
// PRD Digides Toko §7 (docs/product/PRD_DIGIDES_TOKO.md) contract: this
// function resolves exactly ONE wallet per identity — the caller's
// personal/operating wallet (BUMDES/KONTER/USER) — and MUST NEVER be
// extended to also resolve a STORE wallet, even once stores exist. A
// user who owns a store still has a separate, distinct wallet for that
// store (wallet_accounts.store_id, its own exclusive-arc branch); code
// that needs a store's wallet must call a dedicated resolver (e.g. a
// future getWalletForStore(storeId)) and must never fall back to this
// one or assume the two are interchangeable. Every call site of this
// function today (44, audited 2026-09-08) already means "my own
// personal/operating wallet" and needs no change for stores to exist —
// the risk is only ever a *future* call site reaching for this function
// when it actually means a store's wallet.
export async function getWalletForMitraSession(userId: string, roles: string[]): Promise<Wallet | null> {
  if (roles.includes("BUMDES_ADMIN")) {
    const bumdes = await findBumdesByAdminUserId(userId);
    return bumdes ? getWalletByBumdesId(bumdes.id) : null;
  }
  if (roles.includes("KONTER")) {
    const konter = await findKonterByOperatorUserId(userId);
    return konter ? getWalletByKonterId(konter.id) : null;
  }
  return findWalletByOwner("USER", userId);
}

export interface WalletOverviewSummary {
  totalAvailableBalance: string;
  totalHeldBalance: string;
  balanceByOwnerType: Record<WalletAccountType, string>;
  topupToday: string;
  debitToday: string;
  creditToday: string;
  transactionToday: string;
  recentActivity: Awaited<ReturnType<typeof listLedgerGlobal>>;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Aggregates several domains (wallet_accounts, wallets, wallet_ledger)
// purely for the Overview tab — same rationale as dashboard.service.ts:
// this doesn't belong to any single repository function, so it gets its
// own composition here instead of being duplicated inline in the page.
export async function getWalletOverview(): Promise<WalletOverviewSummary> {
  const since = startOfToday();

  const [byOwnerType, heldTotal, topupToday, debitToday, commissionToday, refundToday, debitCount, recentActivity] =
    await Promise.all([
      sumBalancesByOwnerType(),
      sumHeldBalance(),
      sumLedgerAmountByType(["TOPUP"], since),
      sumLedgerAmountByType(["DEBIT"], since),
      sumLedgerAmountByType(["COMMISSION"], since),
      sumLedgerAmountByType(["REFUND"], since),
      sumLedgerAmountByType(["DEBIT"], since),
      listLedgerGlobal({ limit: 10 }),
    ]);

  const balanceByOwnerType: Record<WalletAccountType, string> = {
    BUMDES: "0",
    KONTER: "0",
    USER: "0",
    STORE: "0",
  };
  let totalAvailableBalance = 0;
  for (const row of byOwnerType) {
    balanceByOwnerType[row.account_type] = row.available_balance;
    totalAvailableBalance += Number(row.available_balance);
  }

  return {
    totalAvailableBalance: String(totalAvailableBalance),
    totalHeldBalance: heldTotal,
    balanceByOwnerType,
    topupToday,
    debitToday,
    creditToday: String(Number(topupToday) + Number(commissionToday) + Number(refundToday)),
    transactionToday: debitCount,
    recentActivity,
  };
}

export interface CreateAdjustmentInput {
  walletId: string;
  /** Signed — positive credits the wallet, negative debits it. */
  amount: number;
  reason: string;
  actorUserId: string;
}

// The only way a balance changes outside a real transaction/top-up/
// commission flow — always ledgered (type=ADJUSTMENT, which
// postLedgerEntry already supports), always reasoned, always audited.
// Issue M18 sections 13-14: adjustment never edits old ledger rows, it
// only ever appends a new one.
export async function createAdjustment(input: CreateAdjustmentInput) {
  if (!input.reason.trim()) {
    throw new Error("Alasan adjustment wajib diisi");
  }
  if (input.amount === 0) {
    throw new Error("Nominal adjustment tidak boleh nol");
  }

  return withTransaction(async (client) => {
    const { wallet, ledgerEntry } = await postLedgerEntry(client, {
      walletId: input.walletId,
      type: "ADJUSTMENT",
      amount: input.amount,
      channel: "ADMIN",
      reference: input.reason,
      createdBy: input.actorUserId,
    });

    await recordAuditLog(
      {
        actor_user_id: input.actorUserId,
        action: "WALLET_ADJUSTMENT",
        entity: "wallets",
        entity_id: input.walletId,
        new_value: { amount: input.amount, reason: input.reason, ledger_entry_id: ledgerEntry.id },
      },
      client,
    );

    return { wallet, ledgerEntry };
  });
}

export interface TransferToDownlineInput {
  senderUserId: string;
  senderRoles: string[];
  recipientUserId: string;
  /** Rupiah, must be a positive whole number. */
  amount: number;
  pin: string;
  /** Client-generated, same role as executeTransaction's idempotencyKey —
   *  a retried request (double-tap, a timed-out request the client
   *  resubmits) with the same key is a safe no-op, never a second
   *  transfer. See 043_wallet_transfers.sql. */
  idempotencyKey: string;
}

// Menu Transfer: a BUMDes/Konter sending balance directly to one of their
// own downlines — never to an arbitrary wallet in the system. Mirrors the
// same PIN-gate as a real purchase (verifyTransactionPin), and both
// ledger legs (TRANSFER_OUT on the sender, TRANSFER_IN on the recipient)
// post inside one DB transaction so a mid-flight failure can never create
// or destroy money.
export async function transferToDownline(input: TransferToDownlineInput) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("Nominal transfer tidak valid");
  }
  if (input.recipientUserId === input.senderUserId) {
    throw new Error("Tidak dapat transfer ke akun sendiri");
  }

  await verifyTransactionPin(input.senderUserId, input.pin);

  // The recipient must be a direct, currently-ACTIVE downline of the
  // sender — referral_relationships is the one source of truth for who's
  // downline of whom, never a client-supplied claim.
  const relationship = await findRelationshipByReferredUser(input.recipientUserId);
  if (!relationship || relationship.referrer_id !== input.senderUserId || relationship.status !== "ACTIVE") {
    throw new Error("Penerima bukan downline aktif Anda");
  }

  const [senderWallet, recipientUser, recipientRoles] = await Promise.all([
    getWalletForMitraSession(input.senderUserId, input.senderRoles),
    findUserById(input.recipientUserId),
    listRolesForUser(input.recipientUserId).then((roles) => roles.map((role) => role.code)),
  ]);
  if (!senderWallet) {
    throw new Error("Wallet Anda tidak ditemukan");
  }
  if (!recipientUser) {
    throw new Error("Penerima tidak ditemukan");
  }

  const recipientWallet = await getWalletForMitraSession(input.recipientUserId, recipientRoles);
  if (!recipientWallet) {
    throw new Error("Wallet penerima tidak ditemukan");
  }

  return withTransaction(async (client) => {
    // Claims this transfer intent before either ledger leg is posted —
    // same idempotent-insert shape as transaction.repository.ts's
    // createTransaction. A retried request with the same idempotencyKey
    // never posts a second pair of ledger legs.
    const { transfer, alreadyExisted } = await createWalletTransfer(
      {
        idempotency_key: input.idempotencyKey,
        sender_wallet_id: senderWallet.id,
        recipient_wallet_id: recipientWallet.id,
        amount: input.amount,
        created_by: input.senderUserId,
      },
      client,
    );

    if (alreadyExisted) {
      // Callers never read this response's senderWallet for its balance
      // (both platforms separately re-fetch the wallet after a transfer
      // completes) — returning the pre-transaction snapshot here rather
      // than re-querying is a deliberate simplification, not a bug.
      return {
        senderWallet,
        recipientName: recipientUser.full_name,
        amount: input.amount,
        reference: transfer.id,
      };
    }

    const outLeg = await postLedgerEntry(client, {
      walletId: senderWallet.id,
      type: "TRANSFER_OUT",
      amount: input.amount,
      channel: "WEB",
      transferId: transfer.id,
      reference: transfer.id,
      createdBy: input.senderUserId,
    });

    await postLedgerEntry(client, {
      walletId: recipientWallet.id,
      type: "TRANSFER_IN",
      amount: input.amount,
      channel: "WEB",
      transferId: transfer.id,
      reference: transfer.id,
      createdBy: input.senderUserId,
    });

    await recordAuditLog(
      {
        actor_user_id: input.senderUserId,
        action: "WALLET_TRANSFER_TO_DOWNLINE",
        entity: "wallets",
        entity_id: senderWallet.id,
        new_value: {
          recipient_user_id: input.recipientUserId,
          recipient_wallet_id: recipientWallet.id,
          amount: input.amount,
          transfer_id: transfer.id,
        },
      },
      client,
    );

    return {
      senderWallet: outLeg.wallet,
      recipientName: recipientUser.full_name,
      amount: input.amount,
      reference: transfer.id,
    };
  });
}
