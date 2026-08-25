import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import type { TransactionWithDetail } from "@/repositories/transaction.repository";
import type { TransactionEvent } from "@/types/transaction";
import { TransactionCheckStatusButton } from "./transaction-check-status-button";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function TransactionDetail({
  transaction,
  events,
}: {
  transaction: TransactionWithDetail;
  events: TransactionEvent[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{transaction.product_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{transaction.product_sku}</p>
          </div>
          <StatusBadge status={transaction.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Pemilik Wallet</p>
              <p className="font-medium">{transaction.owner_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">No. Pelanggan</p>
              <p className="font-medium">{transaction.customer_number}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Harga Dasar</p>
              <MoneyDisplay amount={transaction.base_price} size="md" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Harga Jual</p>
              <MoneyDisplay amount={transaction.selling_price} size="md" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kode Idempotensi</p>
              <code className="text-xs">{transaction.idempotency_key}</code>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Referensi Provider</p>
              <p className="font-medium">{transaction.provider_transaction_id ?? "-"}</p>
            </div>
          </div>

          {transaction.status === "RESERVED" ? (
            <TransactionCheckStatusButton transactionId={transaction.id} />
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Riwayat Status</h2>
        <ol className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id} className="flex flex-col gap-1 rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">
                  {event.from_status ? `${event.from_status} → ${event.to_status}` : `Dibuat: ${event.to_status}`}
                </p>
                <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(event.created_at))}</p>
              </div>
              {event.provider_raw_response ? (
                <pre className="overflow-x-auto rounded bg-muted p-2 text-xs text-muted-foreground">
                  {JSON.stringify(event.provider_raw_response, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
