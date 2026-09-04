import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { ProfitFilters, ProfitList, ProfitSummary } from "@/features/profit";
import { getTransactionCount, getTransactionList, getTransactionProfitSummary } from "@/services/transaction.service";
import type { WalletAccountType } from "@/types/wallet";

const PAGE_SIZE = 20;

// Profit is derived from live transaction data (base_price vs
// selling_price) — never statically cached, same reasoning as every other
// financial page in this app.
export const dynamic = "force-dynamic";

interface SuperAdminKeuntunganPageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; ownerType?: string; page?: string }>;
}

export default async function SuperAdminKeuntunganPage({ searchParams }: SuperAdminKeuntunganPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const filter = {
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    // Include the entire end day, not just its midnight instant.
    dateTo: params.dateTo ? new Date(`${params.dateTo}T23:59:59.999`) : undefined,
    ownerType: (params.ownerType as WalletAccountType | undefined) || undefined,
  };

  const listFilter = {
    ...filter,
    status: "SUCCESS" as const,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [summary, transactions, total] = await Promise.all([
    getTransactionProfitSummary(filter),
    getTransactionList(listFilter),
    getTransactionCount(listFilter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(targetPage: number): string {
    const query = new URLSearchParams();
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (params.ownerType) query.set("ownerType", params.ownerType);
    if (targetPage > 1) query.set("page", String(targetPage));
    const queryString = query.toString();
    return `/dashboard/super-admin/keuntungan${queryString ? `?${queryString}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Keuntungan"
        description="Selisih harga asli Digiflazz dan harga jual (setelah markup) dari setiap transaksi berhasil."
      />

      <ProfitFilters />
      <ProfitSummary summary={summary} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Rincian Transaksi</h2>
        <ProfitList transactions={transactions} />
        <PaginationControls page={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </div>
  );
}
