import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/money-display";
import type { TransactionProfitSummary } from "@/repositories/transaction.repository";

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        {children}
      </CardContent>
    </Card>
  );
}

// Harga Asli (base_price, what Digiflazz billed us) vs Harga Jual
// (selling_price, base + Markup) vs the gap between them (Keuntungan) —
// all three shown side by side so the margin is never just a number
// pulled from nowhere, it's visibly "jual minus asli".
export function ProfitSummary({ summary }: { summary: TransactionProfitSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Total Harga Asli (Digiflazz)">
        <MoneyDisplay amount={summary.total_base} size="lg" />
      </StatCard>
      <StatCard label="Total Harga Jual">
        <MoneyDisplay amount={summary.total_selling} size="lg" />
      </StatCard>
      <StatCard label="Total Keuntungan">
        <MoneyDisplay amount={summary.total_profit} size="lg" className="text-status-success" />
      </StatCard>
      <StatCard label="Transaksi Berhasil">
        <p className="text-2xl font-semibold tabular-nums">{summary.count}</p>
      </StatCard>
    </div>
  );
}
