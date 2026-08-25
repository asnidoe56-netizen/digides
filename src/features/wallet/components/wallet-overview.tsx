import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { getWalletOverview } from "@/services/wallet.service";

const OWNER_TYPE_LABEL: Record<string, string> = {
  BUMDES: "BUMDes",
  KONTER: "Konter",
  USER: "Affiliate",
};

const LEDGER_TYPE_LABEL: Record<string, string> = {
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

// Server Component — reads straight from wallet.service, no client fetch.
export async function WalletOverview() {
  const summary = await getWalletOverview();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={summary.totalAvailableBalance} size="lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Tertahan</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={summary.totalHeldBalance} size="lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Top Up Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={summary.topupToday} size="lg" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Debit Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <MoneyDisplay amount={summary.debitToday} size="lg" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["BUMDES", "KONTER", "USER"] as const).map((ownerType) => (
          <Card key={ownerType}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {OWNER_TYPE_LABEL[ownerType]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MoneyDisplay amount={summary.balanceByOwnerType[ownerType]} size="md" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Aktivitas Terbaru</h2>
        {summary.recentActivity.length === 0 ? (
          <EmptyState
            title="Belum ada aktivitas wallet"
            description="Top up, transaksi, atau adjustment akan muncul di sini begitu terjadi."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {summary.recentActivity.map((entry) => {
              const isCredit = ["TOPUP", "RELEASE", "REFUND", "COMMISSION", "ADJUSTMENT"].includes(entry.type);
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{LEDGER_TYPE_LABEL[entry.type] ?? entry.type}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.owner_name} · {OWNER_TYPE_LABEL[entry.account_type]}
                    </p>
                  </div>
                  <MoneyDisplay amount={entry.amount} size="sm" className={isCredit ? "text-status-success" : ""} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
