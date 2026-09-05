import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PaymentWithOwner } from "@/repositories/payment.repository";
import { WalletTopupActions } from "./wallet-topup-actions";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const CHANNEL_LABEL: Record<string, string> = {
  DANA: "DANA",
  TRANSFER_BANK: "Transfer Bank",
};

export interface WalletTopupListProps {
  payments: PaymentWithOwner[];
}

export function WalletTopupList({ payments }: WalletTopupListProps) {
  if (payments.length === 0) {
    return (
      <EmptyState
        title="Belum ada permintaan top up"
        description="Ajukan top up dari halaman detail wallet — permintaan akan muncul di sini untuk diverifikasi."
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 lg:hidden">
        {payments.map((payment) => (
          <div key={payment.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{payment.owner_name}</p>
                <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(payment.created_at))}</p>
              </div>
              <StatusBadge status={payment.status} />
            </div>
            {payment.manual_channel ? (
              <p className="text-xs text-muted-foreground">
                Via {CHANNEL_LABEL[payment.manual_channel] ?? payment.manual_channel}
              </p>
            ) : null}
            <MoneyDisplay amount={payment.amount} size="lg" />
            {payment.status === "PENDING" ? <WalletTopupActions paymentId={payment.id} /> : null}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Pemilik</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="text-muted-foreground">
                  {dateFormatter.format(new Date(payment.created_at))}
                </TableCell>
                <TableCell className="font-medium">{payment.owner_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {payment.manual_channel ? (CHANNEL_LABEL[payment.manual_channel] ?? payment.manual_channel) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amount={payment.amount} size="sm" />
                </TableCell>
                <TableCell>
                  <StatusBadge status={payment.status} />
                </TableCell>
                <TableCell>{payment.status === "PENDING" ? <WalletTopupActions paymentId={payment.id} /> : null}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
