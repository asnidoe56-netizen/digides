import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReconciliationRecordWithDetail } from "@/repositories/reconciliation.repository";
import { ReconciliationResolveDialog } from "./reconciliation-resolve-dialog";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ReconciliationList({ records }: { records: ReconciliationRecordWithDetail[] }) {
  if (records.length === 0) {
    return (
      <EmptyState
        title="Belum ada catatan rekonsiliasi"
        description='Klik "Jalankan Rekonsiliasi" untuk membandingkan transaksi lokal dengan status di Digiflazz.'
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {records.map((record) => (
          <div key={record.id} className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{record.product_name ?? "-"}</p>
                <p className="truncate text-xs text-muted-foreground">{record.idempotency_key ?? "-"}</p>
              </div>
              <StatusBadge status={record.category} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Status Lokal</p>
                <p>{record.local_status ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status Provider</p>
                <p>{record.provider_status ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nominal Lokal</p>
                {record.local_amount ? <MoneyDisplay amount={record.local_amount} size="sm" /> : <p>-</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nominal Provider</p>
                {record.provider_amount ? <MoneyDisplay amount={record.provider_amount} size="sm" /> : <p>-</p>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(record.checked_at))}</p>
            {record.resolved_at ? (
              <p className="text-xs text-status-success">Selesai: {record.resolution_note}</p>
            ) : record.category !== "MATCH" ? (
              <ReconciliationResolveDialog recordId={record.id} />
            ) : null}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Transaksi</TableHead>
              <TableHead>Status Lokal</TableHead>
              <TableHead>Status Provider</TableHead>
              <TableHead className="text-right">Nominal Lokal</TableHead>
              <TableHead className="text-right">Nominal Provider</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="text-muted-foreground">
                  {dateFormatter.format(new Date(record.checked_at))}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{record.product_name ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">{record.idempotency_key ?? "-"}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{record.local_status ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{record.provider_status ?? "-"}</TableCell>
                <TableCell className="text-right">
                  {record.local_amount ? <MoneyDisplay amount={record.local_amount} size="sm" /> : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {record.provider_amount ? <MoneyDisplay amount={record.provider_amount} size="sm" /> : "-"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={record.category} />
                </TableCell>
                <TableCell>
                  {record.resolved_at ? (
                    <span className="text-xs text-status-success">Selesai</span>
                  ) : record.category !== "MATCH" ? (
                    <ReconciliationResolveDialog recordId={record.id} />
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
