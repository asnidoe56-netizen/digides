import type { PoolClient } from "pg";
import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type {
  Wallet,
  WalletAccount,
  WalletAccountType,
  WalletChannel,
  WalletLedgerEntry,
  WalletLedgerType,
} from "@/types/wallet";

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

// Resolves a BUMDes's (Mitra's) wallet from a trusted server-side id
// (the route param, never a client-supplied wallet id) — the credit
// target for "Kirim Saldo ke Mitra" is looked up here, not trusted from
// the request body (issue M18 section 33: never trust the owner from the
// client).
export async function getWalletByBumdesId(bumdesId: string, db: Queryable = pool): Promise<Wallet | null> {
  const result = await db.query<Wallet>(
    `SELECT w.* FROM wallets w
     JOIN wallet_accounts wa ON wa.id = w.wallet_account_id
     WHERE wa.bumdes_id = $1`,
    [bumdesId],
  );
  return result.rows[0] ?? null;
}

// Same shape/reasoning as getWalletByBumdesId — the Konter home screen's
// balance card resolves its own wallet the same trusted, server-side way.
export async function getWalletByKonterId(konterId: string, db: Queryable = pool): Promise<Wallet | null> {
  const result = await db.query<Wallet>(
    `SELECT w.* FROM wallets w
     JOIN wallet_accounts wa ON wa.id = w.wallet_account_id
     WHERE wa.konter_id = $1`,
    [konterId],
  );
  return result.rows[0] ?? null;
}

// Resolves whichever `users.id` a wallet belongs to, whatever kind of
// account it is — the referral system only ever knows users, not
// wallet_accounts, so the Commission Engine needs this to find the
// referrer chain for whoever made a purchase (issue: Komisi menu).
export async function getOwningUserId(walletId: string, db: Queryable = pool): Promise<string | null> {
  const result = await db.query<{ user_id: string | null }>(
    `SELECT COALESCE(wa.user_id, b.admin_user_id, k.operator_user_id) AS user_id
     FROM wallets w
     JOIN wallet_accounts wa ON wa.id = w.wallet_account_id
     LEFT JOIN bumdes b ON b.id = wa.bumdes_id
     LEFT JOIN konters k ON k.id = wa.konter_id
     WHERE w.id = $1`,
    [walletId],
  );
  return result.rows[0]?.user_id ?? null;
}

// The inverse lookup: a user's own wallet, whether they're a plain
// AFFILIATE, a BUMDes admin, or a Konter operator — commission payouts
// credit whichever wallet that user actually owns.
export async function getWalletByOwningUserId(userId: string, db: Queryable = pool): Promise<Wallet | null> {
  const result = await db.query<Wallet>(
    `SELECT w.* FROM wallets w
     JOIN wallet_accounts wa ON wa.id = w.wallet_account_id
     LEFT JOIN bumdes b ON b.id = wa.bumdes_id
     LEFT JOIN konters k ON k.id = wa.konter_id
     WHERE wa.user_id = $1 OR b.admin_user_id = $1 OR k.operator_user_id = $1
     LIMIT 1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

// Sum of every wallet's available_balance — a platform-wide health number
// for the Super Admin dashboard, not something any single wallet operation
// needs, so it lives here rather than alongside postLedgerEntry().
export async function getTotalPlatformBalance(db: Queryable = pool): Promise<string> {
  const result = await db.query<{ sum: string | null }>(
    `SELECT SUM(available_balance) AS sum FROM wallets`,
  );
  return result.rows[0]?.sum ?? "0";
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
  /** Where this mutation originated — see M18 planning notes. */
  channel: WalletChannel;
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
       wallet_id, transaction_id, type, amount, balance_before, balance_after, reference, channel, created_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.walletId,
      input.transactionId ?? null,
      input.type,
      amount,
      availableBefore,
      availableAfter,
      input.reference ?? null,
      input.channel,
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

// --- Wallet Management UI (M18) --------------------------------------
//
// Everything below reads wallet_accounts joined with its owner's display
// name — BUMDes/Konter/User are three different tables, so `owner_name`
// resolves to whichever one actually matches this account's account_type
// (see Architecture Decision #2: exactly one of bumdes_id/konter_id/
// user_id is set). None of this touches balances or the ledger; it's
// read-only reporting on top of the primitives above.

const OWNER_JOIN = `
  LEFT JOIN bumdes b ON b.id = wa.bumdes_id
  LEFT JOIN konters k ON k.id = wa.konter_id
  LEFT JOIN users u ON u.id = wa.user_id
`;
const OWNER_NAME_EXPR = `COALESCE(b.name, k.name, u.full_name)`;

export interface WalletAccountListItem {
  wallet_account_id: string;
  wallet_id: string;
  account_type: WalletAccountType;
  owner_name: string;
  status: WalletAccount["status"];
  available_balance: string;
  held_balance: string;
  total_balance: string;
  created_at: Date;
}

export interface ListWalletAccountsFilter {
  search?: string;
  accountType?: WalletAccountType;
  status?: WalletAccount["status"];
  minBalance?: number;
  maxBalance?: number;
  limit?: number;
  offset?: number;
}

function buildWalletAccountFilterConditions(filter: ListWalletAccountsFilter): {
  where: string;
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.search) {
    params.push(`%${filter.search}%`);
    conditions.push(
      `(b.name ILIKE $${params.length} OR k.name ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`,
    );
  }
  if (filter.accountType) {
    params.push(filter.accountType);
    conditions.push(`wa.account_type = $${params.length}`);
  }
  if (filter.status) {
    params.push(filter.status);
    conditions.push(`wa.status = $${params.length}`);
  }
  if (filter.minBalance !== undefined) {
    params.push(filter.minBalance);
    conditions.push(`w.available_balance >= $${params.length}`);
  }
  if (filter.maxBalance !== undefined) {
    params.push(filter.maxBalance);
    conditions.push(`w.available_balance <= $${params.length}`);
  }

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

export async function listWalletAccounts(
  filter: ListWalletAccountsFilter = {},
  db: Queryable = pool,
): Promise<WalletAccountListItem[]> {
  const { where, params } = buildWalletAccountFilterConditions(filter);
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<WalletAccountListItem>(
    `SELECT
       wa.id AS wallet_account_id,
       w.id AS wallet_id,
       wa.account_type,
       ${OWNER_NAME_EXPR} AS owner_name,
       wa.status,
       w.available_balance,
       w.held_balance,
       w.total_balance,
       wa.created_at
     FROM wallet_accounts wa
     JOIN wallets w ON w.wallet_account_id = wa.id
     ${OWNER_JOIN}
     ${where}
     ORDER BY wa.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countWalletAccounts(
  filter: ListWalletAccountsFilter = {},
  db: Queryable = pool,
): Promise<number> {
  const { where, params } = buildWalletAccountFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM wallet_accounts wa JOIN wallets w ON w.wallet_account_id = wa.id ${OWNER_JOIN} ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}

export async function getWalletAccountDetail(
  walletAccountId: string,
  db: Queryable = pool,
): Promise<WalletAccountListItem | null> {
  const result = await db.query<WalletAccountListItem>(
    `SELECT
       wa.id AS wallet_account_id,
       w.id AS wallet_id,
       wa.account_type,
       ${OWNER_NAME_EXPR} AS owner_name,
       wa.status,
       w.available_balance,
       w.held_balance,
       w.total_balance,
       wa.created_at
     FROM wallet_accounts wa
     JOIN wallets w ON w.wallet_account_id = wa.id
     ${OWNER_JOIN}
     WHERE wa.id = $1`,
    [walletAccountId],
  );
  return result.rows[0] ?? null;
}

export interface OwnerTypeBalanceSummary {
  account_type: WalletAccountType;
  available_balance: string;
  held_balance: string;
}

export async function sumBalancesByOwnerType(db: Queryable = pool): Promise<OwnerTypeBalanceSummary[]> {
  const result = await db.query<OwnerTypeBalanceSummary>(
    `SELECT wa.account_type,
            COALESCE(SUM(w.available_balance), 0) AS available_balance,
            COALESCE(SUM(w.held_balance), 0) AS held_balance
     FROM wallet_accounts wa
     JOIN wallets w ON w.wallet_account_id = wa.id
     GROUP BY wa.account_type`,
  );
  return result.rows;
}

export async function sumHeldBalance(db: Queryable = pool): Promise<string> {
  const result = await db.query<{ sum: string | null }>(`SELECT SUM(held_balance) AS sum FROM wallets`);
  return result.rows[0]?.sum ?? "0";
}

// Sum of ledger amounts for the given types since a timestamp (e.g. "today
// so far") — used by Wallet Overview for "Top Up Hari Ini", "Debit Hari
// Ini", etc. Uses the raw signed `amount` column as stored, not the
// available_balance-delta interpretation postLedgerEntry computes
// internally, since the overview wants "how much moved", not a running
// balance.
export async function sumLedgerAmountByType(
  types: WalletLedgerType[],
  since: Date,
  db: Queryable = pool,
): Promise<string> {
  const result = await db.query<{ sum: string | null }>(
    `SELECT SUM(amount) AS sum FROM wallet_ledger WHERE type = ANY($1::text[]) AND created_at >= $2`,
    [types, since],
  );
  return result.rows[0]?.sum ?? "0";
}

export interface WalletLedgerEntryWithOwner extends WalletLedgerEntry {
  owner_name: string;
  account_type: WalletAccountType;
}

export interface ListLedgerFilter {
  walletId?: string;
  type?: WalletLedgerType;
  channel?: WalletChannel;
  /** BUMDes/Konter/Affiliate(USER) — issue M18 §38's "Laporan" filter list. */
  ownerType?: WalletAccountType;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

function buildLedgerFilterConditions(filter: ListLedgerFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.walletId) {
    params.push(filter.walletId);
    conditions.push(`wl.wallet_id = $${params.length}`);
  }
  if (filter.type) {
    params.push(filter.type);
    conditions.push(`wl.type = $${params.length}`);
  }
  if (filter.channel) {
    params.push(filter.channel);
    conditions.push(`wl.channel = $${params.length}`);
  }
  if (filter.ownerType) {
    params.push(filter.ownerType);
    conditions.push(`wa.account_type = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    conditions.push(
      `(b.name ILIKE $${params.length} OR k.name ILIKE $${params.length} OR u.full_name ILIKE $${params.length} OR wl.reference ILIKE $${params.length})`,
    );
  }
  if (filter.dateFrom) {
    params.push(filter.dateFrom);
    conditions.push(`wl.created_at >= $${params.length}`);
  }
  if (filter.dateTo) {
    params.push(filter.dateTo);
    conditions.push(`wl.created_at <= $${params.length}`);
  }

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

// Powers both the "Mutasi" tab (friendly feed) and the "Ledger" tab (raw
// table) — same rows, two different frontend presentations, so one query
// serves both instead of maintaining two near-identical ones.
export async function listLedgerGlobal(
  filter: ListLedgerFilter = {},
  db: Queryable = pool,
): Promise<WalletLedgerEntryWithOwner[]> {
  const { where, params } = buildLedgerFilterConditions(filter);
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<WalletLedgerEntryWithOwner>(
    `SELECT wl.*, ${OWNER_NAME_EXPR} AS owner_name, wa.account_type
     FROM wallet_ledger wl
     JOIN wallets w ON w.id = wl.wallet_id
     JOIN wallet_accounts wa ON wa.id = w.wallet_account_id
     ${OWNER_JOIN}
     ${where}
     ORDER BY wl.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countLedgerGlobal(filter: ListLedgerFilter = {}, db: Queryable = pool): Promise<number> {
  const { where, params } = buildLedgerFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*)
     FROM wallet_ledger wl
     JOIN wallets w ON w.id = wl.wallet_id
     JOIN wallet_accounts wa ON wa.id = w.wallet_account_id
     ${OWNER_JOIN}
     ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}

// The Laporan menu's per-type breakdown (issue M18 §38: "total debit;
// total credit; top up; commission; refund; ...; adjustment; reserve;
// release") — same filter set as listLedgerGlobal/countLedgerGlobal so the
// summary cards and the detail table underneath are always for the exact
// same slice of data.
export async function sumLedgerAmountsByType(
  filter: ListLedgerFilter = {},
  db: Queryable = pool,
): Promise<Record<WalletLedgerType, string>> {
  const { where, params } = buildLedgerFilterConditions(filter);
  const result = await db.query<{ type: WalletLedgerType; total: string }>(
    `SELECT wl.type, SUM(wl.amount) AS total
     FROM wallet_ledger wl
     JOIN wallets w ON w.id = wl.wallet_id
     JOIN wallet_accounts wa ON wa.id = w.wallet_account_id
     ${OWNER_JOIN}
     ${where}
     GROUP BY wl.type`,
    params,
  );

  const totals: Record<string, string> = {
    TOPUP: "0",
    DEBIT: "0",
    RESERVE: "0",
    RELEASE: "0",
    REFUND: "0",
    COMMISSION: "0",
    PAYOUT: "0",
    ADJUSTMENT: "0",
  };
  for (const row of result.rows) {
    totals[row.type] = row.total;
  }
  return totals as Record<WalletLedgerType, string>;
}
