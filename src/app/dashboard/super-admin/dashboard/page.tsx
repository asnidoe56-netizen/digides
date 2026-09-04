import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { PageHeader } from "@/components/page-header";
import { getRecentActivity, getSuperAdminDashboardSummary } from "@/services/dashboard.service";
import { getDigiflazzBalanceForDisplay } from "@/services/digiflazz.service";
import { getTransactionProfitSummary } from "@/services/transaction.service";

// This page reads live counts/balances straight from the database on every
// request — it must never be statically prerendered at build time (Next.js
// would otherwise cache the first build's snapshot indefinitely, since
// nothing here uses cookies/headers to signal "dynamic" on its own).
export const dynamic = "force-dynamic";

// Server Component: reads straight from the service/repository layer since
// this runs on the server already — no self-fetch to /api/* needed here
// (that HTTP boundary exists for Client Components, not for a page that's
// already server-side). See M03 planning doc section 7-8.
export default async function SuperAdminDashboardPage() {
  const [summary, recentActivity, digiflazzBalance, profitSummary] = await Promise.all([
    getSuperAdminDashboardSummary(),
    getRecentActivity(5),
    getDigiflazzBalanceForDisplay(),
    getTransactionProfitSummary(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description="Ringkasan platform DigiDes" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total BUMDes" value={summary.totalBumdes} />
        <SummaryCard label="Total Konter" value={summary.totalKonters} />
        <SummaryCard label="Total Pengguna" value={summary.totalUsers} />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Saldo Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={summary.totalPlatformBalance} size="lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Digiflazz
              {digiflazzBalance.mode ? ` (${digiflazzBalance.mode})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {digiflazzBalance.success ? (
              <MoneyDisplay amount={digiflazzBalance.balance ?? 0} size="lg" />
            ) : (
              <p className="text-sm text-destructive">
                {digiflazzBalance.message ?? "Gagal memuat saldo Digiflazz."}
              </p>
            )}
          </CardContent>
        </Card>
        <Link href="/dashboard/super-admin/keuntungan" className="block">
          <Card className="h-full transition-colors hover:bg-accent/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Keuntungan</CardTitle>
            </CardHeader>
            <CardContent>
              <MoneyDisplay amount={profitSummary.total_profit} size="lg" className="text-status-success" />
              <p className="text-xs text-muted-foreground">
                {profitSummary.count} transaksi berhasil · sepanjang waktu
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Aktivitas Terbaru</h2>
        {recentActivity.length === 0 ? (
          <EmptyState
            title="Belum ada aktivitas"
            description="Perubahan sensitif seperti wallet, PIN, markup, atau kredensial Digiflazz akan muncul di sini begitu terjadi."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {recentActivity.map((log) => (
              <li key={log.id} className="rounded-lg border p-3 text-sm">
                <span className="font-medium">{log.action}</span>
                <span className="text-muted-foreground"> · {log.entity}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
