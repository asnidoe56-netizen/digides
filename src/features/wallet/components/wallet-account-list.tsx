import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WalletAccountListItem } from "@/repositories/wallet.repository";
import { WalletAccountCard } from "./wallet-account-card";

const TYPE_LABEL: Record<string, string> = {
  BUMDES: "BUMDes",
  KONTER: "Konter",
  USER: "Affiliate",
};

export interface WalletAccountListProps {
  accounts: WalletAccountListItem[];
}

export function WalletAccountList({ accounts }: WalletAccountListProps) {
  if (accounts.length === 0) {
    return (
      <EmptyState
        title="Belum ada wallet yang cocok"
        description="Wallet dibuat otomatis saat BUMDes, Konter, atau pengguna baru terdaftar. Coba ubah filter pencarian."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {accounts.map((account) => (
          <WalletAccountCard key={account.wallet_account_id} account={account} />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pemilik</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead className="text-right">Saldo Tersedia</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.wallet_account_id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/dashboard/super-admin/wallets/${account.wallet_account_id}`}
                    className="hover:underline"
                  >
                    {account.owner_name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{TYPE_LABEL[account.account_type]}</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amount={account.available_balance} size="sm" />
                </TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amount={account.held_balance} size="sm" />
                </TableCell>
                <TableCell>
                  <StatusBadge status={account.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
