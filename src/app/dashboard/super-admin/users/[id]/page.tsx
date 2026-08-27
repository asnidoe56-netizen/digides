import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { UserEditProfileDialog, UserStatusActions } from "@/features/users";
import { getSession } from "@/lib/auth/session";
import { findUserById, listRolesForUser, toPublicUserProfile } from "@/repositories/user.repository";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  BUMDES_ADMIN: "BUMDes Admin",
  KONTER: "Konter",
  AFFILIATE: "Affiliate",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Same reasoning as the list page — status/profile can change from
// another admin's session at any moment.
export const dynamic = "force-dynamic";

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;

  const [user, roles, session] = await Promise.all([findUserById(id), listRolesForUser(id), getSession()]);
  if (!user) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/super-admin/users"
        className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Pengguna
      </Link>

      <PageHeader
        title={user.full_name}
        description="Detail profil pengguna."
        actions={<UserEditProfileDialog user={toPublicUserProfile(user)} />}
      />

      <div className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="font-medium">{user.email}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Nomor WhatsApp</p>
          <p className="font-medium">{user.phone ?? <span className="text-muted-foreground">Belum diisi</span>}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <StatusBadge status={user.status} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Role</p>
          <div className="flex flex-wrap gap-1.5">
            {roles.length > 0 ? (
              roles.map((role) => (
                <span key={role.id} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {ROLE_LABEL[role.code] ?? role.code}
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Belum ada role</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Bergabung sejak</p>
          <p className="font-medium">{dateFormatter.format(user.created_at)}</p>
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">Aksi Akun</p>
        <UserStatusActions
          userId={user.id}
          userName={user.full_name}
          status={user.status}
          isSelf={user.id === session?.userId}
        />
      </div>
    </div>
  );
}
