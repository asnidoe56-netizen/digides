import Link from "next/link";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import type { WalletAccountListItem } from "@/repositories/wallet.repository";

const TYPE_LABEL: Record<string, string> = {
  BUMDES: "BUMDes",
  KONTER: "Konter",
  USER: "Affiliate",
};

export function WalletAccountCard({ account }: { account: WalletAccountListItem }) {
  return (
    <Link
      href={`/dashboard/super-admin/wallets/${account.wallet_account_id}`}
      className="flex flex-col gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{account.owner_name}</p>
          <p className="text-xs text-muted-foreground">{TYPE_LABEL[account.account_type]}</p>
        </div>
        <StatusBadge status={account.status} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Saldo tersedia</p>
          <MoneyDisplay amount={account.available_balance} size="md" />
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Tertahan</p>
          <MoneyDisplay amount={account.held_balance} size="sm" />
        </div>
      </div>
    </Link>
  );
}
