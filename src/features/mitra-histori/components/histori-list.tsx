import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/formatting/money";
import type { TransactionWithDetail } from "@/repositories/transaction.repository";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export interface HistoriListProps {
  transactions: TransactionWithDetail[];
  /** Base path for a Detail Transaksi link (e.g. "/dashboard/konter/histori")
   *  — each row becomes `${historiHref}/${transaction.id}`. Omitted by
   *  Laporan's own "Transaksi" tab, which reuses this same list read-only;
   *  rows there stay exactly as before (not clickable). */
  historiHref?: string;
}

export function HistoriList({ transactions, historiHref }: HistoriListProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="Belum ada transaksi"
        description="Setiap pembelian yang Anda lakukan akan muncul di sini."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {transactions.map((transaction) => {
        const row = (
          <div className="flex flex-col gap-2 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{transaction.product_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {transaction.category_name ?? "Lainnya"} · {transaction.customer_number}
                </p>
              </div>
              <StatusBadge status={transaction.status} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-muted-foreground">
                {dateFormatter.format(new Date(transaction.created_at))}
              </span>
              <span className="font-semibold">{formatMoney(transaction.selling_price)}</span>
            </div>
          </div>
        );

        return historiHref ? (
          <Link key={transaction.id} href={`${historiHref}/${transaction.id}`} className="block">
            {row}
          </Link>
        ) : (
          <div key={transaction.id}>{row}</div>
        );
      })}
    </div>
  );
}
