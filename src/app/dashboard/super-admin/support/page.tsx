import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import {
  AgentFormDialog,
  AgentList,
  SupportOverview,
  SupportTabs,
  TicketList,
  type SupportTabKey,
} from "@/features/support";
import { getSupportAgents, getSupportOverview, getTicketCount, getTickets, getActiveSupportAgentOptions } from "@/services/support.service";
import type { MitraComplaintStatus } from "@/types/notification";

const PAGE_SIZE = 20;

// Ticket volume grows continuously and agent status/workload changes on
// every assignment — never statically prerendered, same reasoning as every
// other admin data page.
export const dynamic = "force-dynamic";

interface SupportPageProps {
  searchParams: Promise<{ tab?: string; status?: string; page?: string }>;
}

function isValidTab(value: string | undefined): value is SupportTabKey {
  return value === "tickets" || value === "team";
}

export default async function SupportPage({ searchParams }: SupportPageProps) {
  const params = await searchParams;
  const tab: SupportTabKey = isValidTab(params.tab) ? params.tab : "tickets";
  const page = Math.max(1, Number(params.page) || 1);

  const overview = await getSupportOverview();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tim Support"
        description="Kelola anggota tim support dan tiket keluhan dari mitra BUMDes."
        actions={tab === "team" ? <AgentFormDialog trigger={<Button type="button">Tambah Agen</Button>} /> : undefined}
      />

      <SupportOverview overview={overview} />

      <SupportTabs active={tab} />

      {tab === "tickets" ? <TicketsTab status={params.status} page={page} /> : null}

      {tab === "team" ? <TeamTab /> : null}
    </div>
  );
}

async function TicketsTab({ status, page }: { status?: string; page: number }) {
  const filter = {
    status: (status as MitraComplaintStatus | undefined) || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [tickets, total, agents] = await Promise.all([
    getTickets(filter),
    getTicketCount(filter),
    getActiveSupportAgentOptions(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <TicketList tickets={tickets} agents={agents} />
      <PaginationControls
        page={page}
        totalPages={totalPages}
        buildHref={(targetPage) => {
          const query = new URLSearchParams();
          query.set("tab", "tickets");
          if (status) query.set("status", status);
          if (targetPage > 1) query.set("page", String(targetPage));
          return `/dashboard/super-admin/support?${query.toString()}`;
        }}
      />
    </div>
  );
}

async function TeamTab() {
  const agents = await getSupportAgents();
  return <AgentList agents={agents} />;
}
