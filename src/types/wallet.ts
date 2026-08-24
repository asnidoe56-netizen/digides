export type WalletAccountType = "BUMDES" | "KONTER" | "USER";
export type WalletAccountStatus = "ACTIVE" | "SUSPENDED" | "CLOSED";

// One of bumdes_id / konter_id / user_id is set, matching account_type —
// enforced by an exclusive-arc CHECK constraint at the database level
// (Architecture Decision #2).
export interface WalletAccount {
  id: string;
  account_type: WalletAccountType;
  bumdes_id: string | null;
  konter_id: string | null;
  user_id: string | null;
  status: WalletAccountStatus;
  created_at: Date;
  updated_at: Date;
}

export interface Wallet {
  id: string;
  wallet_account_id: string;
  available_balance: string;
  held_balance: string;
  total_balance: string;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export type WalletLedgerType =
  | "TOPUP"
  | "DEBIT"
  | "RESERVE"
  | "RELEASE"
  | "REFUND"
  | "COMMISSION"
  | "PAYOUT"
  | "ADJUSTMENT";

// Append-only — never updated or deleted (enforced by a DB trigger).
export interface WalletLedgerEntry {
  id: string;
  wallet_id: string;
  transaction_id: string | null;
  type: WalletLedgerType;
  amount: string;
  balance_before: string;
  balance_after: string;
  reference: string | null;
  created_by: string | null;
  created_at: Date;
}
