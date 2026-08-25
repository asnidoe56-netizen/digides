import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TransactionWithDetail } from "@/repositories/transaction.repository";
import { TransactionCheckStatusButton } from "./transaction-check-status-button";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function TransactionList({ transactions }: { transactions: TransactionWithDetail[] }) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="Belum ada transaksi"
        description="Transaksi pembelian produk akan muncul di sini setelah terjadi."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {transactions.map((transaction) => (
          <Link
            key={transaction.id}
            href={`/dashboard/super-admin/transactions/${transaction.id}`}
            className="flex flex-col gap-2 rounded-lg border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{transaction.product_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {transaction.owner_name} · {transaction.customer_number}
                </p>
              </div>
              <StatusBadge status={transaction.status} />
            </div>
            <div className="flex items-center justify-between">
              <MoneyDisplay amount={transaction.selling_price} size="md" />
              <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(transaction.created_at))}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Pemilik</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>No. Pelanggan</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="text-muted-foreground">
                  {dateFormatter.format(new Date(transaction.created_at))}
                </TableCell>
                <TableCell>{transaction.owner_name}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/super-admin/transactions/${transaction.id}`} className="font-medium hover:underline">
                    {transaction.product_name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{transaction.product_sku}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{transaction.customer_number}</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amount={transaction.selling_price} size="sm" />
                </TableCell>
                <TableCell>
                  <StatusBadge status={transaction.status} />
                </TableCell>
                <TableCell>
                  {transaction.status === "RESERVED" ? (
                    <TransactionCheckStatusButton transactionId={transaction.id} />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
