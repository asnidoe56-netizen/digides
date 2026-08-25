import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TransactionDetail } from "@/features/transaction";
import { getTransactionDetail } from "@/services/transaction.service";

export const dynamic = "force-dynamic";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { transaction, events } = await getTransactionDetail(id);

  if (!transaction) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/super-admin/transactions"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Transaksi
      </Link>

      <PageHeader title="Detail Transaksi" description="Riwayat lengkap dan status transaksi." />

      <TransactionDetail transaction={transaction} events={events} />
    </div>
  );
}
