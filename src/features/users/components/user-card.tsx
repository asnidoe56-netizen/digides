import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import type { UserWithRoles } from "@/repositories/user.repository";
import { UserStatusActions } from "./user-status-actions";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  BUMDES_ADMIN: "BUMDes Admin",
  KONTER: "Konter",
  AFFILIATE: "Affiliate",
};

export interface UserCardProps {
  user: UserWithRoles;
  currentUserId: string;
}

export function UserCard({ user, currentUserId }: UserCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{user.full_name}</p>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <StatusBadge status={user.status} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {user.roles.length > 0 ? (
          user.roles.map((role) => (
            <span key={role} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {ROLE_LABEL[role] ?? role}
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">Belum ada role</span>
        )}
      </div>

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
    </div>
  );
}
