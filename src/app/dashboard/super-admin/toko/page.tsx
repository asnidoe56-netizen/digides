import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { StoreList, StoreStatusFilter } from "@/features/store";
import { countStoresByStatus } from "@/repositories/store.repository";
import { listStoresForAdmin, countStoresForAdmin } from "@/repositories/store.repository";
import type { StoreStatus } from "@/types/store";

const PAGE_SIZE = 20;
const STORE_STATUSES: StoreStatus[] = ["DRAFT", "SUBMITTED", "ACTIVE", "SUSPENDED", "CLOSED"];

// A store's status changes the moment another admin verifies it — never
// statically prerendered, same reasoning as every other admin data page.
export const dynamic = "force-dynamic";

interface SuperAdminTokoPageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function SuperAdminTokoPage({ searchParams }: SuperAdminTokoPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = STORE_STATUSES.find((candidate) => candidate === params.status);

  const filter = { status, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const [stores, total, pendingCount] = await Promise.all([
    listStoresForAdmin(filter),
    countStoresForAdmin(filter),
    countStoresByStatus("SUBMITTED"),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(targetPage: number): string {
    const query = new URLSearchParams();
    if (params.status) query.set("status", params.status);
    if (targetPage > 1) query.set("page", String(targetPage));
    const queryString = query.toString();
    return `/dashboard/super-admin/toko${queryString ? `?${queryString}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Digides Toko"
        description={
          pendingCount > 0
            ? `${pendingCount} toko menunggu verifikasi`
            : `${total} toko terdaftar`
        }
      />

      <StoreStatusFilter current={status} pendingCount={pendingCount} />
      <StoreList stores={stores} />
      <PaginationControls page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
