import { withTransaction } from "@/lib/db/transaction";
import {
  postLedgerEntry,
  sumBalancesByOwnerType,
  sumHeldBalance,
  sumLedgerAmountByType,
  listLedgerGlobal,
  getWalletByBumdesId,
  getWalletByKonterId,
} from "@/repositories/wallet.repository";
import { findBumdesByAdminUserId } from "@/repositories/bumdes.repository";
import { findKonterByOperatorUserId } from "@/repositories/konter.repository";
import { recordAuditLog } from "@/repositories/audit.repository";
import type { Wallet, WalletAccountType } from "@/types/wallet";

// Resolves "my own wallet" for a BUMDES_ADMIN or KONTER session — the
// Beranda balance card and every purchase-flow price screen (Pulsa, and
// whatever category screens follow it) all need this same lookup, done
// server-side from the session rather than trusting a client-supplied id.
export async function getWalletForMitraSession(userId: string, roles: string[]): Promise<Wallet | null> {
  if (roles.includes("BUMDES_ADMIN")) {
    const bumdes = await findBumdesByAdminUserId(userId);
    return bumdes ? getWalletByBumdesId(bumdes.id) : null;
  }
  if (roles.includes("KONTER")) {
    const konter = await findKonterByOperatorUserId(userId);
    return konter ? getWalletByKonterId(konter.id) : null;
  }
  return null;
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
