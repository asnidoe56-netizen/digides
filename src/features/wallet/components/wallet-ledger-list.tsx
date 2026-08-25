import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WalletLedgerEntryWithOwner } from "@/repositories/wallet.repository";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<string, string> = {
  TOPUP: "Top Up",
  DEBIT: "Transaksi",
  RESERVE: "Reserve",
  RELEASE: "Release",
  REFUND: "Refund",
  COMMISSION: "Komisi",
  PAYOUT: "Payout",
  ADJUSTMENT: "Adjustment",
  TRANSFER_OUT: "Transfer Keluar",
  TRANSFER_IN: "Transfer Masuk",
};

// Money moving INTO available_balance — see postLedgerEntry's formula
// table in wallet.repository.ts. Everything else moves it out (or, for
// RESERVE, moves it into held instead — still shown as a debit here since
// available balance goes down).
const CREDIT_TYPES = new Set(["TOPUP", "RELEASE", "REFUND", "COMMISSION", "TRANSFER_IN"]);

function isCredit(entry: WalletLedgerEntryWithOwner): boolean {
  if (entry.type === "ADJUSTMENT") return Number(entry.amount) > 0;
  return CREDIT_TYPES.has(entry.type);
}

const CHANNEL_LABEL: Record<string, string> = {
  WEB: "Web",
  TELEGRAM: "Telegram",
  ADMIN: "Admin",
  SYSTEM: "System",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export interface WalletLedgerListProps {
  entries: WalletLedgerEntryWithOwner[];
  /** "mutasi" = friendly feed, "ledger" = raw reference/opening/closing table. */
  variant: "mutasi" | "ledger";
  /** Hide the owner column when already scoped to one wallet (detail page). */
  showOwner?: boolean;
}

export function WalletLedgerList({ entries, variant, showOwner = true }: WalletLedgerListProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Belum ada mutasi"
        description="Top up, transaksi, atau adjustment yang terjadi akan tercatat di sini."
      />
    );
  }

  if (variant === "mutasi") {
    return (
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => {
          const credit = isCredit(entry);
          return (
            <li key={entry.id} className="flex items-center justify-between gap-3 rounded-lg border p-4">
              <div className="min-w-0">
                <p className="font-medium">{TYPE_LABEL[entry.type] ?? entry.type}</p>
                {showOwner ? <p className="truncate text-sm text-muted-foreground">{entry.owner_name}</p> : null}
                <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(entry.created_at))}</p>
              </div>
              <MoneyDisplay
                amount={`${credit ? "+" : "-"}${Math.abs(Number(entry.amount))}`}
                size="md"
                className={cn(credit ? "text-status-success" : "text-status-failed")}
              />
            </li>
          );
        })}
      </ul>
    );
  }

  // Ledger: the raw, technical view — full reference/opening/closing per
  // issue M18 section 18, with debit/credit as separate columns like a
  // real accounting ledger instead of one signed number.
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Waktu</TableHead>
            {showOwner ? <TableHead>Wallet</TableHead> : null}
            <TableHead>Tipe</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Channel</TableHead>
            <TableHead className="text-right">Debit</TableHead>
            <TableHead className="text-right">Credit</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const credit = isCredit(entry);
            const amount = Math.abs(Number(entry.amount));
            return (
              <TableRow key={entry.id}>
                <TableCell className="text-muted-foreground">
                  {dateFormatter.format(new Date(entry.created_at))}
                </TableCell>
                {showOwner ? <TableCell>{entry.owner_name}</TableCell> : null}
                <TableCell>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {TYPE_LABEL[entry.type] ?? entry.type}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{entry.reference ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{CHANNEL_LABEL[entry.channel]}</TableCell>
                <TableCell className="text-right">{!credit ? <MoneyDisplay amount={amount} size="sm" /> : null}</TableCell>
                <TableCell className="text-right">{credit ? <MoneyDisplay amount={amount} size="sm" /> : null}</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amount={entry.balance_after} size="sm" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
