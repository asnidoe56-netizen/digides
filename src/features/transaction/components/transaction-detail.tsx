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

// True once the automatic backup-SKU failover (transaction.service.ts's
// trySwapToBackupSku) has swapped this transaction away from the product
// it was first created against — see 041_transaction_backup_sku.sql.
function wasSwappedToBackupSku(transaction: TransactionWithDetail): boolean {
  return transaction.original_product_id !== null && transaction.original_product_id !== transaction.product_id;
}

interface BackupSkuSwapPayload {
  event: "BACKUP_SKU_SWAPPED";
  from_sku: string;
  to_sku: string;
  /** Digiflazz's own rc/message explaining why from_sku was abandoned —
   *  absent on swap events recorded before this field was added. */
  from_sku_failure?: { rc?: string; message?: string };
}

function isBackupSkuSwapPayload(value: unknown): value is BackupSkuSwapPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { event?: unknown }).event === "BACKUP_SKU_SWAPPED"
  );
}

export function TransactionDetail({
  transaction,
  events,
}: {
  transaction: TransactionWithDetail;
  events: TransactionEvent[];
}) {
  const swapped = wasSwappedToBackupSku(transaction);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">{transaction.product_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{transaction.product_sku}</p>
          </div>
          <div className="flex items-center gap-2">
            {swapped ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                SKU cadangan digunakan
              </span>
            ) : null}
            <StatusBadge status={transaction.status} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {swapped ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              SKU asli untuk transaksi ini gagal di Digiflazz — sistem otomatis mencari dan memakai SKU cadangan
              dengan nominal yang sama. Harga jual ke mitra tidak berubah; lihat Riwayat Status di bawah untuk
              rincian SKU mana yang dicoba, dan menu Komisi untuk melihat apakah komisi ikut disesuaikan karena
              margin SKU cadangan lebih kecil.
            </p>
          ) : null}
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
          {events.map((event) => {
            const swapPayload = isBackupSkuSwapPayload(event.provider_raw_response)
              ? event.provider_raw_response
              : null;
            return (
              <li key={event.id} className="flex flex-col gap-1 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">
                    {swapPayload
                      ? "SKU diganti otomatis (cadangan)"
                      : event.from_status
                        ? `${event.from_status} → ${event.to_status}`
                        : `Dibuat: ${event.to_status}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(event.created_at))}</p>
                </div>
                {swapPayload ? (
                  <p className="text-sm text-muted-foreground">
                    SKU <code className="text-foreground">{swapPayload.from_sku}</code> gagal
                    {swapPayload.from_sku_failure?.message
                      ? ` (${swapPayload.from_sku_failure.rc ? `rc ${swapPayload.from_sku_failure.rc}: ` : ""}${swapPayload.from_sku_failure.message})`
                      : ""}{" "}
                    → otomatis dicoba ulang dengan SKU cadangan{" "}
                    <code className="text-foreground">{swapPayload.to_sku}</code>.
                  </p>
                ) : event.provider_raw_response ? (
                  <pre className="overflow-x-auto rounded bg-muted p-2 text-xs text-muted-foreground">
                    {JSON.stringify(event.provider_raw_response, null, 2)}
                  </pre>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
