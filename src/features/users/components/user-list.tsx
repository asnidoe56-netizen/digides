import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UserWithRoles } from "@/repositories/user.repository";
import { UserCard } from "./user-card";
import { UserStatusActions } from "./user-status-actions";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  BUMDES_ADMIN: "BUMDes Admin",
  KONTER: "Konter",
  AFFILIATE: "Affiliate",
};

export interface UserListProps {
  users: UserWithRoles[];
  currentUserId: string;
}

// Same "one data source, two presentations" pattern as ProductList — card
// grid through tablet, table from `lg:` up.
export function UserList({ users, currentUserId }: UserListProps) {
  if (users.length === 0) {
    return (
      <EmptyState
        title="Belum ada pengguna yang cocok"
        description="Ubah kata kunci atau filter pencarian."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {users.map((user) => (
          <UserCard key={user.id} user={user} currentUserId={currentUserId} />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {user.roles.length > 0
                      ? user.roles.map((role) => (
                          <span
                            key={role}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {ROLE_LABEL[role] ?? role}
                          </span>
                        ))
                      : "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={user.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/super-admin/users/${user.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Lihat Detail
                    </Link>
                    <UserStatusActions
                      userId={user.id}
                      userName={user.full_name}
                      status={user.status}
                      isSelf={user.id === currentUserId}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
