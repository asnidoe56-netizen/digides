import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { AuditLogFilters, AuditLogList } from "@/features/audit";
import { getAuditEntityOptions, getAuditLogCount, getAuditLogs } from "@/services/audit.service";

const PAGE_SIZE = 20;

// New entries land constantly as admins act elsewhere in the app — never
// statically cached, same reasoning as every other admin data page.
export const dynamic = "force-dynamic";

interface SuperAdminAuditLogsPageProps {
  searchParams: Promise<{
    entity?: string;
    actor?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
  }>;
}

export default async function SuperAdminAuditLogsPage({ searchParams }: SuperAdminAuditLogsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const filter = {
    entity: params.entity || undefined,
    actorSearch: params.actor || undefined,
    dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
    dateTo: params.dateTo ? new Date(`${params.dateTo}T23:59:59.999`) : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [logs, total, entities] = await Promise.all([
    getAuditLogs(filter),
    getAuditLogCount(filter),
    getAuditEntityOptions(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(targetPage: number): string {
    const query = new URLSearchParams();
    if (params.entity) query.set("entity", params.entity);
    if (params.actor) query.set("actor", params.actor);
    if (params.dateFrom) query.set("dateFrom", params.dateFrom);
    if (params.dateTo) query.set("dateTo", params.dateTo);
    if (targetPage > 1) query.set("page", String(targetPage));
    const queryString = query.toString();
    return `/dashboard/super-admin/audit-logs${queryString ? `?${queryString}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Audit Log" description={`${total} aktivitas tercatat di seluruh platform`} />
      <AuditLogFilters entities={entities} />
      <AuditLogList logs={logs} />
      <PaginationControls page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
