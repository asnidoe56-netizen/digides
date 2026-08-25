import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { TransactionFilters, TransactionList } from "@/features/transaction";
import { getTransactionCount, getTransactionList } from "@/services/transaction.service";
import type { TransactionStatus } from "@/types/transaction";

const PAGE_SIZE = 20;

// Transaction status changes constantly (RESERVED -> SUCCESS/FAILED) —
// never statically cached, same reasoning as every other admin data page.
export const dynamic = "force-dynamic";

interface SuperAdminTransactionsPageProps {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}

export default async function SuperAdminTransactionsPage({ searchParams }: SuperAdminTransactionsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const filter = {
    status: (params.status as TransactionStatus | undefined) || undefined,
    search: params.search || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [transactions, total] = await Promise.all([getTransactionList(filter), getTransactionCount(filter)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(targetPage: number): string {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (params.search) query.set("search", params.search);
    if (targetPage > 1) query.set("page", String(targetPage));
    const queryString = query.toString();
    return `/dashboard/super-admin/transactions${queryString ? `?${queryString}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Transaksi" description={`${total} transaksi tercatat di seluruh platform`} />
      <TransactionFilters />
      <TransactionList transactions={transactions} />
      <PaginationControls page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
