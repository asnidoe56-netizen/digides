import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { ReconciliationFilters, ReconciliationList, ReconciliationRunForm } from "@/features/reconciliation";
import { getReconciliationRecordCount, getReconciliationRecords } from "@/services/reconciliation.service";
import type { ReconciliationCategory } from "@/types/reconciliation";

const PAGE_SIZE = 20;

// Reconciliation results change every time a run is triggered — never
// statically cached, same reasoning as every other admin data page.
export const dynamic = "force-dynamic";

interface SuperAdminReconciliationPageProps {
  searchParams: Promise<{ category?: string; resolved?: string; page?: string }>;
}

export default async function SuperAdminReconciliationPage({ searchParams }: SuperAdminReconciliationPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const filter = {
    category: (params.category as ReconciliationCategory | undefined) || undefined,
    unresolved: params.resolved === "false" ? true : params.resolved === "true" ? false : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [records, total] = await Promise.all([
    getReconciliationRecords(filter),
    getReconciliationRecordCount(filter),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(targetPage: number): string {
    const query = new URLSearchParams();
    if (params.category) query.set("category", params.category);
    if (params.resolved) query.set("resolved", params.resolved);
    if (targetPage > 1) query.set("page", String(targetPage));
    const queryString = query.toString();
    return `/dashboard/super-admin/reconciliation${queryString ? `?${queryString}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rekonsiliasi"
        description="Bandingkan transaksi lokal dengan status di Digiflazz untuk menemukan ketidaksesuaian."
      />

      <ReconciliationRunForm />
      <ReconciliationFilters />
      <ReconciliationList records={records} />
      <PaginationControls page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
