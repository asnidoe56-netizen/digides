import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TransactionWithDetail } from "@/repositories/transaction.repository";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Every row here is already known SUCCESS (the page only ever passes
// sumTransactionProfit-filtered, status-pinned results) — no StatusBadge
// column needed, the space goes to the base/selling/profit breakdown
// instead: Keuntungan is computed inline (selling - base) so it's always
// visibly derived from the two prices next to it, never a bare number.
export function ProfitList({ transactions }: { transactions: TransactionWithDetail[] }) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        title="Belum ada keuntungan"
        description="Transaksi berhasil dalam rentang ini akan muncul di sini beserta rinciannya."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {transactions.map((transaction) => {
          const profit = Number(transaction.selling_price) - Number(transaction.base_price);
          return (
            <Link
              key={transaction.id}
              href={`/dashboard/super-admin/transactions/${transaction.id}`}
              className="flex flex-col gap-2 rounded-lg border p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{transaction.product_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {transaction.owner_name} · {dateFormatter.format(new Date(transaction.created_at))}
                </p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  <MoneyDisplay amount={transaction.base_price} size="sm" /> →{" "}
                  <MoneyDisplay amount={transaction.selling_price} size="sm" />
                </span>
                <MoneyDisplay amount={profit} size="md" className="text-status-success" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Pemilik</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead className="text-right">Harga Asli</TableHead>
              <TableHead className="text-right">Harga Jual</TableHead>
              <TableHead className="text-right">Keuntungan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const profit = Number(transaction.selling_price) - Number(transaction.base_price);
              return (
                <TableRow key={transaction.id}>
                  <TableCell className="text-muted-foreground">
                    {dateFormatter.format(new Date(transaction.created_at))}
                  </TableCell>
                  <TableCell>{transaction.owner_name}</TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/super-admin/transactions/${transaction.id}`}
                      className="font-medium hover:underline"
                    >
                      {transaction.product_name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{transaction.product_sku}</p>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    <MoneyDisplay amount={transaction.base_price} size="sm" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay amount={transaction.selling_price} size="sm" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MoneyDisplay amount={profit} size="sm" className="font-medium text-status-success" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
