import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/money-display";

export interface MitraRecapSummaryProps {
  transactionCount: number;
  transactionValue: string;
  totalMasuk: string;
  totalKeluar: string;
  breakdown: Array<{ label: string; amount: string }>;
}

// The "Rekap" tab's summary cards for the selected period — aggregated
// from the same wallet_ledger/transactions data as the Transaksi/Mutasi
// tabs (sumLedgerAmountsByType, sumTransactionVolume), just totaled
// instead of listed row by row.
export function MitraRecapSummary({
  transactionCount,
  transactionValue,
  totalMasuk,
  totalKeluar,
  breakdown,
}: MitraRecapSummaryProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            <span className="text-lg font-semibold tabular-nums">{transactionCount}</span>
            <MoneyDisplay amount={transactionValue} size="sm" className="text-muted-foreground" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Mutasi Masuk</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={totalMasuk} size="lg" className="text-status-success" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Mutasi Keluar</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={totalKeluar} size="lg" className="text-status-failed" />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">Rincian per Jenis</h2>
        <div className="overflow-hidden rounded-2xl border">
          {breakdown.map((row, index) => (
            <div
              key={row.label}
              className={`flex items-center justify-between px-4 py-3 ${index > 0 ? "border-t" : ""}`}
            >
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <MoneyDisplay amount={row.amount} size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
