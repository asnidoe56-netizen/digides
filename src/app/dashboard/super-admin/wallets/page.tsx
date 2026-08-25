import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import {
  WalletAccountFilters,
  WalletAccountList,
  WalletLedgerFilters,
  WalletLedgerList,
  WalletOverview,
  WalletTabs,
  WalletTopupList,
  type WalletTabKey,
} from "@/features/wallet";
import { listPayments, countPayments } from "@/repositories/payment.repository";
import { countLedgerGlobal, countWalletAccounts, listLedgerGlobal, listWalletAccounts } from "@/repositories/wallet.repository";
import type { WalletAccountStatus, WalletAccountType, WalletChannel, WalletLedgerType } from "@/types/wallet";

const PAGE_SIZE = 20;

// Balances/mutations/top-up requests change constantly — never statically
// prerendered, same reasoning as every other admin data page.
export const dynamic = "force-dynamic";

interface SuperAdminWalletsPageProps {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    accountType?: string;
    status?: string;
    minBalance?: string;
    maxBalance?: string;
    type?: string;
    channel?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

function isValidTab(value: string | undefined): value is WalletTabKey {
  return value === "overview" || value === "accounts" || value === "mutasi" || value === "topup" || value === "ledger";
}

export default async function SuperAdminWalletsPage({ searchParams }: SuperAdminWalletsPageProps) {
  const params = await searchParams;
  const tab: WalletTabKey = isValidTab(params.tab) ? params.tab : "overview";
  const page = Math.max(1, Number(params.page) || 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Wallet" description="Kelola saldo, mutasi, top up, dan ledger seluruh wallet DigiDes." />

      <WalletTabs active={tab} />

      {tab === "overview" ? <WalletOverview /> : null}

      {tab === "accounts" ? (
        <WalletAccountsTab
          search={params.search}
          accountType={params.accountType}
          status={params.status}
          minBalance={params.minBalance}
          maxBalance={params.maxBalance}
          page={page}
        />
      ) : null}

      {tab === "mutasi" || tab === "ledger" ? (
        <LedgerTab
          variant={tab}
          search={params.search}
          type={params.type}
          channel={params.channel}
          dateFrom={params.dateFrom}
          dateTo={params.dateTo}
          page={page}
        />
      ) : null}

      {tab === "topup" ? <TopupTab page={page} /> : null}
    </div>
  );
}

async function WalletAccountsTab(props: {
  search?: string;
  accountType?: string;
  status?: string;
  minBalance?: string;
  maxBalance?: string;
  page: number;
}) {
  const filter = {
    search: props.search || undefined,
    accountType: (props.accountType as WalletAccountType | undefined) || undefined,
    status: (props.status as WalletAccountStatus | undefined) || undefined,
    minBalance: props.minBalance ? Number(props.minBalance) : undefined,
    maxBalance: props.maxBalance ? Number(props.maxBalance) : undefined,
    limit: PAGE_SIZE,
    offset: (props.page - 1) * PAGE_SIZE,
  };

  const [accounts, total] = await Promise.all([listWalletAccounts(filter), countWalletAccounts(filter)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <WalletAccountFilters />
      <WalletAccountList accounts={accounts} />
      <PaginationControls
        page={props.page}
        totalPages={totalPages}
        buildHref={(targetPage) => buildTabHref("accounts", { ...props, page: undefined }, targetPage)}
      />
    </div>
  );
}

async function LedgerTab(props: {
  variant: "mutasi" | "ledger";
  search?: string;
  type?: string;
  channel?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
}) {
  const filter = {
    search: props.search || undefined,
    type: (props.type as WalletLedgerType | undefined) || undefined,
    channel: (props.channel as WalletChannel | undefined) || undefined,
    dateFrom: props.dateFrom ? new Date(props.dateFrom) : undefined,
    dateTo: props.dateTo ? new Date(props.dateTo) : undefined,
    limit: PAGE_SIZE,
    offset: (props.page - 1) * PAGE_SIZE,
  };

  const [entries, total] = await Promise.all([listLedgerGlobal(filter), countLedgerGlobal(filter)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <WalletLedgerFilters
        tab={props.variant}
        dialogTitle={props.variant === "mutasi" ? "Filter Mutasi" : "Filter Ledger"}
      />
      <WalletLedgerList entries={entries} variant={props.variant} />
      <PaginationControls
        page={props.page}
        totalPages={totalPages}
        buildHref={(targetPage) => buildTabHref(props.variant, { ...props, page: undefined }, targetPage)}
      />
    </div>
  );
}

async function TopupTab({ page }: { page: number }) {
  const filter = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const [payments, total] = await Promise.all([listPayments(filter), countPayments(filter)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <WalletTopupList payments={payments} />
      <PaginationControls
        page={page}
        totalPages={totalPages}
        buildHref={(targetPage) => buildTabHref("topup", {}, targetPage)}
      />
    </div>
  );
}

function buildTabHref(tab: WalletTabKey, params: Record<string, string | number | undefined>, targetPage: number) {
  const query = new URLSearchParams();
  query.set("tab", tab);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && key !== "page" && key !== "variant") {
      query.set(key, String(value));
    }
  }
  if (targetPage > 1) query.set("page", String(targetPage));
  return `/dashboard/super-admin/wallets?${query.toString()}`;
}
