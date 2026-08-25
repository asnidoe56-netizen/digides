import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { TransactionList } from "@/features/transaction";
import { getReservedTransactionsSummary, getTransactionCount, getTransactionList } from "@/services/transaction.service";

const PAGE_SIZE = 20;

// Held funds and the set of stuck transactions change constantly — never
// statically prerendered, same reasoning as every other admin data page.
export const dynamic = "force-dynamic";

interface TransaksiTertahanPageProps {
  searchParams: Promise<{ page?: string }>;
}

// A focused view of the general Transaksi list, pinned to RESERVED only —
// these are transactions where funds were reserved from a mitra's wallet
// but Digiflazz never returned a final Sukses/Gagal, so the money sits in
// held_balance instead of being debited or released back. TransactionList
// already renders a "Cek Status" button per RESERVED row (re-asks
// Digiflazz using the same ref_id), so reusing it here gives admins the
// one safe resolution action without any new component.
export default async function TransaksiTertahanPage({ searchParams }: TransaksiTertahanPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const filter = { status: "RESERVED" as const, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };

  const [transactions, total, summary] = await Promise.all([
    getTransactionList(filter),
    getTransactionCount(filter),
    getReservedTransactionsSummary(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(targetPage: number): string {
    const query = new URLSearchParams();
    if (targetPage > 1) query.set("page", String(targetPage));
    const queryString = query.toString();
    return `/dashboard/super-admin/transaksi-tertahan${queryString ? `?${queryString}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transaksi Tertahan"
        description="Transaksi yang masih menahan saldo mitra karena Digiflazz belum memberi jawaban akhir."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jumlah Transaksi Tertahan</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold tabular-nums">{summary.count}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Dana Tertahan</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={summary.total_value} size="lg" />
          </CardContent>
        </Card>
      </div>

      <TransactionList transactions={transactions} />
      <PaginationControls page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
