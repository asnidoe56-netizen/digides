import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { ReportFilters, ReportSummary } from "@/features/report";
import { WalletLedgerList } from "@/features/wallet";
import { countWalletReportEntries, getWalletReportEntries, getWalletReportSummary } from "@/services/report.service";
import type { WalletAccountType, WalletChannel, WalletLedgerType } from "@/types/wallet";

const PAGE_SIZE = 20;

// Every number here is computed fresh from the ledger for the selected
// filter window — never statically cached, same reasoning as every other
// financial page in this app.
export const dynamic = "force-dynamic";

interface SuperAdminReportsPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    ownerType?: string;
    channel?: string;
    type?: string;
    page?: string;
  }>;
}

export default async function SuperAdminReportsPage({ searchParams }: SuperAdminReportsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const filter = {
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    // Include the entire end day, not just its midnight instant.
    dateTo: params.dateTo ? new Date(`${params.dateTo}T23:59:59.999`) : undefined,
    ownerType: (params.ownerType as WalletAccountType | undefined) || undefined,
    channel: (params.channel as WalletChannel | undefined) || undefined,
  };

  const entriesFilter = {
    ...filter,
    type: (params.type as WalletLedgerType | undefined) || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [summary, entries, total] = await Promise.all([
    getWalletReportSummary(filter),
    getWalletReportEntries(entriesFilter),
    countWalletReportEntries(entriesFilter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(targetPage: number): string {
    const query = new URLSearchParams();
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.ownerType) query.set("ownerType", params.ownerType);
    if (params.channel) query.set("channel", params.channel);
    if (params.type) query.set("type", params.type);
    if (targetPage > 1) query.set("page", String(targetPage));
    const queryString = query.toString();
    return `/dashboard/super-admin/reports${queryString ? `?${queryString}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Laporan"
        description="Ringkasan finansial platform: saldo, mutasi per tipe, dan volume transaksi."
      />

      <ReportFilters />
      <ReportSummary summary={summary} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Rincian Mutasi</h2>
        <WalletLedgerList entries={entries} variant="ledger" />
        <PaginationControls page={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
