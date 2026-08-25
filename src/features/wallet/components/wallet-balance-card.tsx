import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import type { WalletAccountListItem } from "@/repositories/wallet.repository";
import { WalletAdjustmentDialog } from "./wallet-adjustment-dialog";
import { WalletTopupRequestDialog } from "./wallet-topup-request-dialog";

const TYPE_LABEL: Record<string, string> = {
  BUMDES: "BUMDes",
  KONTER: "Konter",
  USER: "Affiliate",
};

export function WalletBalanceCard({ account }: { account: WalletAccountListItem }) {
  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <div>
          <CardTitle className="text-xl">{account.owner_name}</CardTitle>
          <p className="text-sm text-muted-foreground">{TYPE_LABEL[account.account_type]}</p>
        </div>
        <StatusBadge status={account.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Saldo tersedia</p>
            <MoneyDisplay amount={account.available_balance} size="lg" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Saldo tertahan</p>
            <MoneyDisplay amount={account.held_balance} size="lg" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <MoneyDisplay amount={account.total_balance} size="lg" />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <WalletTopupRequestDialog walletId={account.wallet_id} />
          <WalletAdjustmentDialog walletId={account.wallet_id} />
        </div>
      </CardContent>
    </Card>
  );
}
