import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CommissionPayoutWithBeneficiary } from "@/repositories/commission.repository";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function CommissionPayoutHistory({ payouts }: { payouts: CommissionPayoutWithBeneficiary[] }) {
  if (payouts.length === 0) {
    return (
      <EmptyState title="Belum ada riwayat payout" description="Payout yang sudah diproses akan tercatat di sini." />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Waktu</TableHead>
            <TableHead>Penerima</TableHead>
            <TableHead className="text-right">Nominal</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payouts.map((payout) => (
            <TableRow key={payout.id}>
              <TableCell className="text-muted-foreground">
                {dateFormatter.format(new Date(payout.requested_at))}
              </TableCell>
              <TableCell>
                <p className="font-medium">{payout.beneficiary_name}</p>
                <p className="text-xs text-muted-foreground">{payout.beneficiary_email}</p>
              </TableCell>
              <TableCell className="text-right">
                <MoneyDisplay amount={payout.amount} size="sm" />
              </TableCell>
              <TableCell>
                <StatusBadge status={payout.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
