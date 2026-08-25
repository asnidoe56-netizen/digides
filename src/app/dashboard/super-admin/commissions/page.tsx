import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { Button } from "@/components/ui/button";
import {
  CommissionLedgerFilters,
  CommissionLedgerList,
  CommissionPayoutHistory,
  CommissionPayoutSummary,
  CommissionRuleFormDialog,
  CommissionRuleList,
  CommissionSettleButton,
  CommissionTabs,
  type CommissionTabKey,
} from "@/features/commission";
import {
  getAvailableCommissionSummary,
  getCommissionLedger,
  getCommissionPayoutHistory,
  getCommissionRules,
} from "@/services/commission.service";
import { countCommissionLedgerGlobal } from "@/repositories/commission.repository";
import { listCategories } from "@/repositories/product.repository";
import type { CommissionLedgerStatus } from "@/types/commission";

const PAGE_SIZE = 20;

// Rules/ledger/payout state all change from admin actions on this same
// page — never statically cached, same reasoning as Wallet and Markup.
export const dynamic = "force-dynamic";

interface SuperAdminCommissionsPageProps {
  searchParams: Promise<{
    tab?: string;
    status?: string;
    level?: string;
    search?: string;
    page?: string;
  }>;
}

function isValidTab(value: string | undefined): value is CommissionTabKey {
  return value === "rules" || value === "ledger" || value === "payouts";
}

export default async function SuperAdminCommissionsPage({ searchParams }: SuperAdminCommissionsPageProps) {
  const params = await searchParams;
  const tab: CommissionTabKey = isValidTab(params.tab) ? params.tab : "rules";
  const page = Math.max(1, Number(params.page) || 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Komisi"
        description="Atur aturan komisi referral, pantau ledger komisi, dan bayarkan komisi yang tersedia."
      />

      <CommissionTabs active={tab} />

      {tab === "rules" ? <RulesTab /> : null}
      {tab === "ledger" ? (
        <LedgerTab status={params.status} level={params.level} search={params.search} page={page} />
      ) : null}
      {tab === "payouts" ? <PayoutsTab /> : null}
    </div>
  );
}

async function RulesTab() {
  const [rules, categories] = await Promise.all([getCommissionRules(), listCategories()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <CommissionRuleFormDialog
          categories={categories}
          trigger={
            <Button type="button" className="h-11">
              Tambah Aturan
            </Button>
          }
        />
      </div>
      <CommissionRuleList rules={rules} categories={categories} />
    </div>
  );
}

async function LedgerTab(props: { status?: string; level?: string; search?: string; page: number }) {
  const filter = {
    status: (props.status as CommissionLedgerStatus | undefined) || undefined,
    level: props.level ? Number(props.level) : undefined,
    search: props.search || undefined,
    limit: PAGE_SIZE,
    offset: (props.page - 1) * PAGE_SIZE,
  };

  const [entries, total] = await Promise.all([getCommissionLedger(filter), countCommissionLedgerGlobal(filter)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <CommissionSettleButton />
      <CommissionLedgerFilters />
      <CommissionLedgerList entries={entries} />
      <PaginationControls
        page={props.page}
        totalPages={totalPages}
        buildHref={(targetPage) => {
          const query = new URLSearchParams();
          query.set("tab", "ledger");
          if (props.status) query.set("status", props.status);
          if (props.level) query.set("level", props.level);
          if (props.search) query.set("search", props.search);
          if (targetPage > 1) query.set("page", String(targetPage));
          return `/dashboard/super-admin/commissions?${query.toString()}`;
        }}
      />
    </div>
  );
}

async function PayoutsTab() {
  const [summary, history] = await Promise.all([getAvailableCommissionSummary(), getCommissionPayoutHistory()]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Siap Dibayarkan</h2>
        <CommissionPayoutSummary summary={summary} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Riwayat Payout</h2>
        <CommissionPayoutHistory payouts={history} />
      </section>
    </div>
  );
}
