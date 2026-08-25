import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { WalletBalanceCard, WalletLedgerFilters, WalletLedgerList } from "@/features/wallet";
import { countLedgerGlobal, getWalletAccountDetail, listLedgerGlobal } from "@/repositories/wallet.repository";
import type { WalletChannel, WalletLedgerType } from "@/types/wallet";

const PAGE_SIZE = 20;

// Same reasoning as the wallet list page — balances and mutations change
// constantly and must never be statically cached.
export const dynamic = "force-dynamic";

interface WalletDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    type?: string;
    channel?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

export default async function WalletDetailPage({ params, searchParams }: WalletDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const account = await getWalletAccountDetail(id);
  if (!account) notFound();

  const variant: "mutasi" | "ledger" = query.tab === "ledger" ? "ledger" : "mutasi";
  const page = Math.max(1, Number(query.page) || 1);

  const filter = {
    walletId: account.wallet_id,
    type: (query.type as WalletLedgerType | undefined) || undefined,
    channel: (query.channel as WalletChannel | undefined) || undefined,
    dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
    dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [entries, total] = await Promise.all([listLedgerGlobal(filter), countLedgerGlobal(filter)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/super-admin/wallets?tab=accounts"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Wallet Accounts
      </Link>

      <PageHeader title={account.owner_name} description="Detail wallet, saldo, dan riwayat mutasi." />

      <WalletBalanceCard account={account} />

      <div className="flex flex-col gap-4">
        <div className="flex gap-2 border-b">
          <Link
            href={`/dashboard/super-admin/wallets/${id}?tab=mutasi`}
            className={
              variant === "mutasi"
                ? "border-b-2 border-primary px-1 pb-2 text-sm font-medium"
                : "px-1 pb-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            Mutasi
          </Link>
          <Link
            href={`/dashboard/super-admin/wallets/${id}?tab=ledger`}
            className={
              variant === "ledger"
                ? "border-b-2 border-primary px-1 pb-2 text-sm font-medium"
                : "px-1 pb-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            Ledger
          </Link>
        </div>

        <WalletLedgerFilters
          tab={variant}
          dialogTitle={variant === "mutasi" ? "Filter Mutasi" : "Filter Ledger"}
          searchPlaceholder="Cari reference..."
        />
        <WalletLedgerList entries={entries} variant={variant} showOwner={false} />
        <PaginationControls
          page={page}
          totalPages={totalPages}
          buildHref={(targetPage) => {
            const q = new URLSearchParams();
            q.set("tab", variant);
            if (query.type) q.set("type", query.type);
            if (query.channel) q.set("channel", query.channel);
            if (query.dateFrom) q.set("dateFrom", query.dateFrom);
            if (query.dateTo) q.set("dateTo", query.dateTo);
            if (targetPage > 1) q.set("page", String(targetPage));
            return `/dashboard/super-admin/wallets/${id}?${q.toString()}`;
          }}
        />
      </div>
    </div>
  );
}
