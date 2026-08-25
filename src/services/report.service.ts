import {
  countLedgerGlobal,
  listLedgerGlobal,
  sumBalancesByOwnerType,
  sumLedgerAmountsByType,
  type ListLedgerFilter,
} from "@/repositories/wallet.repository";
import { sumTransactionVolume } from "@/repositories/transaction.repository";
import type { WalletAccountType, WalletChannel } from "@/types/wallet";

export interface WalletReportFilter {
  dateFrom?: Date;
  dateTo?: Date;
  ownerType?: WalletAccountType;
  channel?: WalletChannel;
}

export interface WalletReportSummary {
  /** Current balance, not date-filtered — a running total, not a period sum. */
  totalSaldo: string;
  totalDebit: string;
  totalCredit: string;
  topUp: string;
  commission: string;
  refund: string;
  adjustment: string;
  reserve: string;
  release: string;
  transactionCount: number;
  transactionValue: string;
}

// Issue M18 §38's "Laporan": total saldo, total debit, total credit, top
// up, commission, refund, transaction, adjustment, reserve, release — all
// filterable by Date, BUMDes/Konter/Affiliate, Channel, Transaction Type.
// Every number here comes from wallet_ledger/transactions, never from
// wallets.available_balance directly except the running-total "Total
// Saldo" card, which is a snapshot by nature.
export async function getWalletReportSummary(filter: WalletReportFilter): Promise<WalletReportSummary> {
  const ledgerFilter: ListLedgerFilter = {
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
    ownerType: filter.ownerType,
    channel: filter.channel,
  };

  const [typeSums, balances, transactionVolume] = await Promise.all([
    sumLedgerAmountsByType(ledgerFilter),
    sumBalancesByOwnerType(),
    sumTransactionVolume({ dateFrom: filter.dateFrom, dateTo: filter.dateTo, ownerType: filter.ownerType }),
  ]);

  const totalSaldo = filter.ownerType
    ? (balances.find((row) => row.account_type === filter.ownerType)?.available_balance ?? "0")
    : String(balances.reduce((sum, row) => sum + Number(row.available_balance), 0));

  return {
    totalSaldo,
    totalDebit: typeSums.DEBIT,
    totalCredit: String(Number(typeSums.TOPUP) + Number(typeSums.REFUND) + Number(typeSums.COMMISSION)),
    topUp: typeSums.TOPUP,
    commission: typeSums.COMMISSION,
    refund: typeSums.REFUND,
    adjustment: typeSums.ADJUSTMENT,
    reserve: typeSums.RESERVE,
    release: typeSums.RELEASE,
    transactionCount: transactionVolume.count,
    transactionValue: transactionVolume.total_value,
  };
}

export interface WalletReportEntriesFilter extends WalletReportFilter {
  type?: ListLedgerFilter["type"];
  limit?: number;
  offset?: number;
}

// The detail table under the summary cards — same rows as the Wallet
// menu's Ledger tab (listLedgerGlobal), reused rather than duplicated,
// just with the report's own filter set (adds ownerType, drops search).
export async function getWalletReportEntries(filter: WalletReportEntriesFilter) {
  return listLedgerGlobal(filter);
}

export async function countWalletReportEntries(filter: WalletReportEntriesFilter) {
  return countLedgerGlobal(filter);
}
