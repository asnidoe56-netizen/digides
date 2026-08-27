import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import {
  DownloadPdfButton,
  type DownloadPdfButtonProps,
  LaporanPrintHeader,
  LaporanTabs,
  PeriodSelector,
  MitraRecapSummary,
  type LaporanTabKey,
  type PeriodKey,
} from "@/features/mitra-report";
import { HistoriList } from "@/features/mitra-histori";
import { WalletLedgerList } from "@/features/wallet";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/repositories/user.repository";
import { sumTransactionVolume } from "@/repositories/transaction.repository";
import { countLedgerGlobal, listLedgerGlobal, sumLedgerAmountsByType } from "@/repositories/wallet.repository";
import { getTransactionCount, getTransactionList } from "@/services/transaction.service";
import { getWalletForMitraSession } from "@/services/wallet.service";

const PAGE_SIZE = 20;

const TAB_LABEL: Record<LaporanTabKey, string> = {
  transaksi: "Transaksi",
  mutasi: "Mutasi",
  rekap: "Rekap",
};

const PERIOD_LABEL: Record<PeriodKey, string> = {
  week: "Mingguan (7 hari terakhir)",
  month: "Bulanan (30 hari terakhir)",
  year: "Tahunan (setahun terakhir)",
  custom: "Kustom",
};

const LEDGER_TYPE_LABEL: Record<string, string> = {
  TOPUP: "Top Up",
  DEBIT: "Transaksi",
  RESERVE: "Reserve",
  RELEASE: "Release",
  REFUND: "Refund",
  COMMISSION: "Komisi",
  PAYOUT: "Payout",
  ADJUSTMENT: "Adjustment",
  TRANSFER_OUT: "Transfer Keluar",
  TRANSFER_IN: "Transfer Masuk",
};

const displayDateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

function resolveDateRange(period: PeriodKey, dateFrom?: string, dateTo?: string): { from: Date; to: Date } {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (period === "custom" && dateFrom && dateTo) {
    return { from: new Date(`${dateFrom}T00:00:00`), to: new Date(`${dateTo}T23:59:59.999`) };
  }

  const days = period === "year" ? 365 : period === "month" ? 30 : 7;
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  return { from, to: endOfToday };
}

// Report engine is shared by every mitra role — only the session's role
// check and href base differ, same convention as every other bumdes/
// konter page pair in this app.
export const dynamic = "force-dynamic";

interface LaporanPageProps {
  searchParams: Promise<{ tab?: string; period?: string; dateFrom?: string; dateTo?: string; page?: string }>;
}

export default async function BumdesLaporanPage({ searchParams }: LaporanPageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const query = await searchParams;
  const tab: LaporanTabKey = query.tab === "mutasi" ? "mutasi" : query.tab === "rekap" ? "rekap" : "transaksi";
  const period: PeriodKey =
    query.period === "month" ? "month" : query.period === "year" ? "year" : query.period === "custom" ? "custom" : "week";
  const { from, to } = resolveDateRange(period, query.dateFrom, query.dateTo);
  const page = Math.max(1, Number(query.page) || 1);

  const [user, wallet] = await Promise.all([findUserById(session.userId), getWalletForMitraSession(session.userId, session.roles)]);
  const walletId = wallet?.id ?? "";

  const baseHref = "/dashboard/bumdes/laporan";
  function buildHref(overrides: { tab?: LaporanTabKey; page?: number }): string {
    const params = new URLSearchParams();
    params.set("tab", overrides.tab ?? tab);
    params.set("period", period);
    if (period === "custom") {
      if (query.dateFrom) params.set("dateFrom", query.dateFrom);
      if (query.dateTo) params.set("dateTo", query.dateTo);
    }
    if (overrides.page && overrides.page > 1) params.set("page", String(overrides.page));
    return `${baseHref}?${params.toString()}`;
  }

  const periodLabel =
    period === "custom"
      ? `${displayDateFormatter.format(from)} - ${displayDateFormatter.format(to)}`
      : `${PERIOD_LABEL[period]} (${displayDateFormatter.format(from)} - ${displayDateFormatter.format(to)})`;

  const fullName = user?.full_name ?? "";
  let content: React.ReactNode = null;
  let pagination: React.ReactNode = null;
  let downloadProps: DownloadPdfButtonProps;

  if (tab === "transaksi") {
    const filter = { walletId, dateFrom: from, dateTo: to, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
    const [transactions, total] = await Promise.all([getTransactionList(filter), getTransactionCount(filter)]);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    content = <HistoriList transactions={transactions} />;
    pagination = (
      <PaginationControls page={page} totalPages={totalPages} buildHref={(p) => buildHref({ tab: "transaksi", page: p })} />
    );
    downloadProps = { kind: "transaksi", fullName, periodLabel, transactions };
  } else if (tab === "mutasi") {
    const filter = { walletId, dateFrom: from, dateTo: to, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
    const [entries, total] = await Promise.all([listLedgerGlobal(filter), countLedgerGlobal(filter)]);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    content = <WalletLedgerList entries={entries} variant="mutasi" showOwner={false} />;
    pagination = (
      <PaginationControls page={page} totalPages={totalPages} buildHref={(p) => buildHref({ tab: "mutasi", page: p })} />
    );
    downloadProps = { kind: "mutasi", fullName, periodLabel, entries };
  } else {
    const [typeSums, transactionVolume] = await Promise.all([
      sumLedgerAmountsByType({ walletId, dateFrom: from, dateTo: to }),
      sumTransactionVolume({ walletId, dateFrom: from, dateTo: to }),
    ]);
    const totalMasuk =
      Number(typeSums.TOPUP) + Number(typeSums.REFUND) + Number(typeSums.COMMISSION) + Number(typeSums.TRANSFER_IN) + Number(typeSums.RELEASE);
    const totalKeluar = Number(typeSums.DEBIT) + Number(typeSums.RESERVE) + Number(typeSums.TRANSFER_OUT);
    const breakdown = Object.entries(typeSums)
      .filter(([, amount]) => Number(amount) !== 0)
      .map(([type, amount]) => ({ label: LEDGER_TYPE_LABEL[type] ?? type, amount }));

    content = (
      <MitraRecapSummary
        transactionCount={transactionVolume.count}
        transactionValue={transactionVolume.total_value}
        totalMasuk={String(totalMasuk)}
        totalKeluar={String(totalKeluar)}
        breakdown={breakdown}
      />
    );
    downloadProps = {
      kind: "rekap",
      fullName,
      periodLabel,
      transactionCount: transactionVolume.count,
      transactionValue: transactionVolume.total_value,
      totalMasuk: String(totalMasuk),
      totalKeluar: String(totalKeluar),
      breakdown,
    };
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Sticky report header — title, tabs, period filter, and Download
          PDF all stay pinned at the top while the report's own list below
          scrolls underneath. Same standing pattern as the purchase-flow
          screens (category-purchase-flow.tsx): one opaque `sticky top-0`
          block, no separate header-offset to keep in sync. */}
      <div className="sticky top-0 z-20 flex flex-col gap-4 bg-background px-4 pt-4 pb-4">
        <PageHeader title="Laporan" description="Riwayat transaksi, mutasi saldo, dan rekap sesuai periode." />

        <LaporanPrintHeader fullName={fullName} tabLabel={TAB_LABEL[tab]} periodLabel={periodLabel} />

        <LaporanTabs active={tab} buildHref={(t) => buildHref({ tab: t })} />
        <PeriodSelector activePeriod={period} dateFrom={query.dateFrom} dateTo={query.dateTo} />

        <div className="print:hidden flex justify-end">
          <DownloadPdfButton {...downloadProps} />
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4">
        <div className="flex flex-col gap-3">{content}</div>
        {pagination}
      </div>
    </div>
  );
}
