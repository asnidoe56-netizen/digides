import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/money-display";
import type { WalletReportSummary } from "@/services/report.service";

function StatCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        {children}
      </CardContent>
    </Card>
  );
}

// Issue M18 §38's 10 required metrics, laid out as a responsive card grid
// — the same "one data source" summary regardless of screen size.
export function ReportSummary({ summary }: { summary: WalletReportSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Total Saldo">
        <MoneyDisplay amount={summary.totalSaldo} size="lg" />
      </StatCard>
      <StatCard label="Total Debit">
        <MoneyDisplay amount={summary.totalDebit} size="lg" className="text-status-failed" />
      </StatCard>
      <StatCard label="Total Credit">
        <MoneyDisplay amount={summary.totalCredit} size="lg" className="text-status-success" />
      </StatCard>
      <StatCard label="Top Up">
        <MoneyDisplay amount={summary.topUp} size="lg" />
      </StatCard>
      <StatCard label="Komisi">
        <MoneyDisplay amount={summary.commission} size="lg" />
      </StatCard>
      <StatCard label="Refund">
        <MoneyDisplay amount={summary.refund} size="lg" />
      </StatCard>
      <StatCard label="Reserve">
        <MoneyDisplay amount={summary.reserve} size="lg" />
      </StatCard>
      <StatCard label="Release">
        <MoneyDisplay amount={summary.release} size="lg" />
      </StatCard>
      <StatCard label="Adjustment">
        <MoneyDisplay amount={summary.adjustment} size="lg" />
      </StatCard>
      <StatCard label="Transaksi">
        <MoneyDisplay amount={summary.transactionValue} size="lg" />
        <p className="text-xs text-muted-foreground">{summary.transactionCount} transaksi</p>
      </StatCard>
    </div>
  );
}
