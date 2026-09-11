import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/money-display";
import type { TransactionProfitSummary } from "@/repositories/transaction.repository";

function StatCard({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        {children}
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

// Harga Asli (base_price, what Digiflazz billed us) vs Harga Jual
// (selling_price, base + Markup) vs the gap between them (Keuntungan) —
// all three shown side by side so the margin is never just a number
// pulled from nowhere, it's visibly "jual minus asli".
//
// Cashback (PRD Cashback §9 Tahap 4) sits beside Keuntungan as its own line
// instead of being quietly subtracted from it. "Total Keuntungan" keeps its
// long-standing meaning, and the question the PRD asks — "cashback bulan
// ini memakan berapa dari keuntungan?" — is answered by reading two numbers
// and a third that is visibly their difference.
export function ProfitSummary({ summary }: { summary: TransactionProfitSummary }) {
  const cashback = Number(summary.total_cashback);
  const profit = Number(summary.total_profit);
  const afterCashback = profit - cashback;
  const share = profit > 0 ? Math.round((cashback / profit) * 1000) / 10 : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Total Harga Asli (Digiflazz)">
        <MoneyDisplay amount={summary.total_base} size="lg" />
      </StatCard>
      <StatCard label="Total Harga Jual">
        <MoneyDisplay amount={summary.total_selling} size="lg" />
      </StatCard>
      <StatCard label="Total Keuntungan">
        <MoneyDisplay amount={summary.total_profit} size="lg" className="text-status-success" />
      </StatCard>
      <StatCard
        label="Cashback Dibayar"
        hint={cashback > 0 ? `${share.toLocaleString("id-ID")}% dari keuntungan` : "Belum ada cashback"}
      >
        <MoneyDisplay amount={summary.total_cashback} size="lg" />
      </StatCard>
      <StatCard label="Keuntungan Setelah Cashback" hint="Keuntungan − cashback">
        <MoneyDisplay amount={String(afterCashback)} size="lg" className="text-status-success" />
      </StatCard>
      <StatCard label="Transaksi Berhasil">
        <p className="text-2xl font-semibold tabular-nums">{summary.count}</p>
      </StatCard>
    </div>
  );
}
