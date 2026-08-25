import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CommissionLedgerEntryWithDetail } from "@/repositories/commission.repository";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export interface CommissionLedgerListProps {
  entries: CommissionLedgerEntryWithDetail[];
}

export function CommissionLedgerList({ entries }: CommissionLedgerListProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Belum ada komisi"
        description="Komisi tercatat di sini setelah transaksi pembelian berhasil dan referral terhubung."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {entries.map((entry) => (
          <div key={entry.id} className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{entry.beneficiary_name}</p>
                <p className="truncate text-xs text-muted-foreground">{entry.beneficiary_email}</p>
              </div>
              <StatusBadge status={entry.status} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Level {entry.level} · {entry.rule_percentage}%</p>
              <MoneyDisplay amount={entry.amount} size="md" />
            </div>
            <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(entry.created_at))}</p>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Penerima</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tersedia Mulai</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground">
                  {dateFormatter.format(new Date(entry.created_at))}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{entry.beneficiary_name}</p>
                  <p className="text-xs text-muted-foreground">{entry.beneficiary_email}</p>
                </TableCell>
                <TableCell>
                  Level {entry.level} · {entry.rule_percentage}%
                </TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amount={entry.amount} size="sm" />
                </TableCell>
                <TableCell>
                  <StatusBadge status={entry.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {entry.available_at ? dateFormatter.format(new Date(entry.available_at)) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
