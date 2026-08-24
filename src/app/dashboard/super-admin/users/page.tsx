import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { UserFilters, UserList } from "@/features/users";
import { getSession } from "@/lib/auth/session";
import { countFilteredUsers, listUsers } from "@/repositories/user.repository";
import type { RoleCode, UserStatus } from "@/types/user";

const PAGE_SIZE = 20;

// Status can change from another admin's session at any moment — never
// statically prerendered, same reasoning as the dashboard/products pages.
export const dynamic = "force-dynamic";

interface SuperAdminUsersPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    role?: string;
    page?: string;
  }>;
}

export default async function SuperAdminUsersPage({ searchParams }: SuperAdminUsersPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const session = await getSession();

  const filter = {
    search: params.search || undefined,
    status: (params.status as UserStatus | undefined) || undefined,
    role: (params.role as RoleCode | undefined) || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [users, total] = await Promise.all([listUsers(filter), countFilteredUsers(filter)]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(targetPage: number): string {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.status) query.set("status", params.status);
    if (params.role) query.set("role", params.role);
    if (targetPage > 1) query.set("page", String(targetPage));
    const queryString = query.toString();
    return `/dashboard/super-admin/users${queryString ? `?${queryString}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pengguna" description={`${total} pengguna terdaftar`} />

      <UserFilters />
      <UserList users={users} currentUserId={session?.userId ?? ""} />
      <PaginationControls page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
