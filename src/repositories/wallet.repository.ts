import type { PoolClient } from "pg";
import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { Wallet, WalletAccount, WalletAccountType, WalletLedgerEntry, WalletLedgerType } from "@/types/wallet";

// --- wallet_accounts ---------------------------------------------------

export type CreateWalletAccountInput =
  | { account_type: "BUMDES"; bumdes_id: string }
  | { account_type: "KONTER"; konter_id: string }
  | { account_type: "USER"; user_id: string };

export async function createWalletAccount(
  input: CreateWalletAccountInput,
  db: Queryable = pool,
): Promise<WalletAccount> {
  const result = await db.query<WalletAccount>(
    `INSERT INTO wallet_accounts (account_type, bumdes_id, konter_id, user_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.account_type,
      input.account_type === "BUMDES" ? input.bumdes_id : null,
      input.account_type === "KONTER" ? input.konter_id : null,
      input.account_type === "USER" ? input.user_id : null,
    ],
  );
  return result.rows[0];
}

export async function findWalletAccountByOwner(
  ownerType: WalletAccountType,
  ownerId: string,
  db: Queryable = pool,
): Promise<WalletAccount | null> {
  const column = ownerType === "BUMDES" ? "bumdes_id" : ownerType === "KONTER" ? "konter_id" : "user_id";
  const result = await db.query<WalletAccount>(
    `SELECT * FROM wallet_accounts WHERE account_type = $1 AND ${column} = $2`,
    [ownerType, ownerId],
  );
  return result.rows[0] ?? null;
}

// --- wallets -------------------------------------------------------------

export async function createWallet(walletAccountId: string, db: Queryable = pool): Promise<Wallet> {
  const result = await db.query<Wallet>(
    `INSERT INTO wallets (wallet_account_id) VALUES ($1) RETURNING *`,
    [walletAccountId],
  );
  return result.rows[0];
}

// Convenience for onboarding: create the account + its wallet together.
// Callers run this inside withTransaction alongside creating the owning
// BUMDes/Konter/User row — see M02 planning doc section 9.
export async function provisionWalletForAccount(
  input: CreateWalletAccountInput,
  client: PoolClient,
): Promise<{ account: WalletAccount; wallet: Wallet }> {
  const account = await createWalletAccount(input, client);
  const wallet = await createWallet(account.id, client);
  return { account, wallet };
}

export async function getWalletById(id: string, db: Queryable = pool): Promise<Wallet | null> {
  const result = await db.query<Wallet>(`SELECT * FROM wallets WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function getWalletByAccountId(
  walletAccountId: string,
  db: Queryable = pool,
): Promise<Wallet | null> {
  const result = await db.query<Wallet>(`SELECT * FROM wallets WHERE wallet_account_id = $1`, [
    walletAccountId,
  ]);
  return result.rows[0] ?? null;
}

export async function findWalletByOwner(
  ownerType: WalletAccountType,
  ownerId: string,
  db: Queryable = pool,
): Promise<Wallet | null> {
  const column = ownerType === "BUMDES" ? "bumdes_id" : ownerType === "KONTER" ? "konter_id" : "user_id";
  const result = await db.query<Wallet>(
    `SELECT w.* FROM wallets w
     JOIN wallet_accounts wa ON wa.id = w.wallet_account_id
     WHERE wa.account_type = $1 AND wa.${column} = $2`,
    [ownerType, ownerId],
  );
  return result.rows[0] ?? null;
}

// Locks the wallet row for the remainder of the caller's transaction.
// MUST be called with a PoolClient obtained from withTransaction() — never
// with the shared pool — otherwise the lock is released immediately and
// gives no protection against concurrent writers.
export async function getWalletForUpdate(id: string, client: PoolClient): Promise<Wallet> {
  const result = await client.query<Wallet>(`SELECT * FROM wallets WHERE id = $1 FOR UPDATE`, [id]);
  const wallet = result.rows[0];
  if (!wallet) {
    throw new Error(`Wallet ${id} not found`);
  }
  return wallet;
}

// --- wallet_ledger ---------------------------------------------------------

export interface PostLedgerEntryInput {
  walletId: string;
  type: WalletLedgerType;
  /**
   * Magnitude of the event (always positive) for every type except
   * ADJUSTMENT, where the caller passes a signed delta to
   * available_balance because an adjustment can move either direction —
   * see M02 planning doc section 9.
   */
  amount: number | string;
  transactionId?: string | null;
  reference?: string | null;
  createdBy?: string | null;
}

/**
 * The single choke point for every wallet balance change. Locks the wallet
 * row (FOR UPDATE), computes the new available/held balances per the
 * formula table in the M02 planning doc, updates `wallets`, and inserts the
 * matching `wallet_ledger` row — all within the caller's transaction so the
 * ledger can never drift from the cached balance. Must be called with a
 * PoolClient from an open withTransaction(); never with the shared pool.
 */
export async function postLedgerEntry(
  client: PoolClient,
  input: PostLedgerEntryInput,
): Promise<{ wallet: Wallet; ledgerEntry: WalletLedgerEntry }> {
  const wallet = await getWalletForUpdate(input.walletId, client);

  const amount = Number(input.amount);
  const availableBefore = Number(wallet.available_balance);
  const heldBefore = Number(wallet.held_balance);

  let availableDelta = 0;
  let heldDelta = 0;

  if (input.type === "ADJUSTMENT") {
    if (!input.createdBy) {
      throw new Error("ADJUSTMENT ledger entries require createdBy for audit purposes");
    }
    if (amount === 0) {
      throw new Error("ADJUSTMENT amount must be non-zero");
    }
    availableDelta = amount;
  } else {
    if (!(amount > 0)) {
      throw new Error(`${input.type} amount must be a positive magnitude`);
    }
    switch (input.type) {
      case "RESERVE":
        availableDelta = -amount;
        heldDelta = amount;
        break;
      case "DEBIT": // final capture of a previously reserved amount
        heldDelta = -amount;
        break;
      case "RELEASE":
        heldDelta = -amount;
        availableDelta = amount;
        break;
      case "REFUND":
      case "TOPUP":
      case "COMMISSION":
        availableDelta = amount;
        break;
      case "PAYOUT":
        availableDelta = -amount;
        break;
    }
  }

  const availableAfter = availableBefore + availableDelta;
  const heldAfter = heldBefore + heldDelta;

  if (availableAfter < 0 || heldAfter < 0) {
    throw new Error(
      `Insufficient balance on wallet ${input.walletId} for ${input.type} of ${amount}`,
    );
  }

  const updateResult = await client.query<Wallet>(
    `UPDATE wallets
     SET available_balance = $2, held_balance = $3, version = version + 1
     WHERE id = $1
     RETURNING *`,
    [input.walletId, availableAfter, heldAfter],
  );

  const ledgerResult = await client.query<WalletLedgerEntry>(
    `INSERT INTO wallet_ledger (
       wallet_id, transaction_id, type, amount, balance_before, balance_after, reference, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.walletId,
      input.transactionId ?? null,
      input.type,
      amount,
      availableBefore,
      availableAfter,
      input.reference ?? null,
      input.createdBy ?? null,
    ],
  );

  return { wallet: updateResult.rows[0], ledgerEntry: ledgerResult.rows[0] };
}

export async function listLedgerForWallet(
  walletId: string,
  limit = 50,
  db: Queryable = pool,
): Promise<WalletLedgerEntry[]> {
  const result = await db.query<WalletLedgerEntry>(
    `SELECT * FROM wallet_ledger WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [walletId, limit],
  );
  return result.rows;
}

// Health-check for the reconciliation job — the ledger must always sum to
// the wallet's current available_balance. Any mismatch is a bug, not
// something this function fixes.
export async function verifyLedgerConsistency(
  walletId: string,
  db: Queryable = pool,
): Promise<{ consistent: boolean; walletAvailableBalance: string; ledgerSum: string }> {
  const walletResult = await db.query<{ available_balance: string }>(
    `SELECT available_balance FROM wallets WHERE id = $1`,
    [walletId],
  );
  const ledgerResult = await db.query<{ sum: string | null }>(
    `SELECT SUM(
       CASE
         WHEN type IN ('RESERVE', 'PAYOUT') THEN -amount
         WHEN type IN ('RELEASE', 'REFUND', 'TOPUP', 'COMMISSION') THEN amount
         WHEN type = 'ADJUSTMENT' THEN amount
         ELSE 0
       END
     ) AS sum
     FROM wallet_ledger WHERE wallet_id = $1`,
    [walletId],
  );

  const walletAvailableBalance = walletResult.rows[0]?.available_balance ?? "0";
  const ledgerSum = ledgerResult.rows[0]?.sum ?? "0";

  return {
    consistent: Number(walletAvailableBalance) === Number(ledgerSum),
    walletAvailableBalance,
    ledgerSum,
  };
}
