import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { UserEditProfileDialog, UserRecoveryActions, UserStatusActions } from "@/features/users";
import { getSession } from "@/lib/auth/session";
import { findUserById, listRolesForUser, toPublicUserProfile } from "@/repositories/user.repository";
import { findWilayahNamesByCodes } from "@/repositories/wilayah.repository";

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  BUMDES_ADMIN: "BUMDes Admin",
  KONTER: "Konter",
  AFFILIATE: "Affiliate",
};

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
});

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

  const wilayahNames = await findWilayahNamesByCodes([
    user.province_code,
    user.regency_code,
    user.district_code,
    user.village_code,
  ]);
  // Broad-to-specific, matching the mitra app's own registration/Lengkapi
  // Profil dropdown order (Provinsi -> Kabupaten/Kota -> Kecamatan ->
  // Kelurahan/Desa) — never partially resolved: an account either
  // completed all four levels together (see users_province_code_fkey
  // etc.) or none, so any single code being set implies all four are.
  const addressParts = [user.province_code, user.regency_code, user.district_code, user.village_code]
    .map((code) => (code ? wilayahNames.get(code) : null))
    .filter((name): name is string => Boolean(name));
  const hasLocation = user.registration_latitude != null && user.registration_longitude != null;

  // Computed on the server, so an admin who leaves this page open doesn't
  // watch a countdown tick — they refresh, and get the truth.
  const isLocked = user.locked_until !== null && user.locked_until > new Date();
  const minutesLeft = isLocked
    ? Math.max(1, Math.ceil((user.locked_until!.getTime() - Date.now()) / 60_000))
    : 0;

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
          {/* The gap this page used to have. `status` says ACTIVE for an
              account that is locked out and cannot log in at all, so an
              admin reading this screen concluded nothing was wrong while
              the mitra was stuck in a fifteen-minute loop. Shown only
              while the lock is actually in force — a lock that has
              already expired is history, not a state. */}
          {isLocked ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <Lock className="size-3.5" />
              Terkunci sampai {timeFormatter.format(user.locked_until!)} (
              {minutesLeft} menit lagi)
            </p>
          ) : null}
          {user.must_change_password ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Password sementara aktif — wajib diganti saat masuk.
            </p>
          ) : null}
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
        <div className="sm:col-span-2">
          <p className="text-xs text-muted-foreground">Alamat</p>
          {addressParts.length > 0 ? (
            <p className="font-medium">{addressParts.join(", ")}</p>
          ) : (
            <span className="text-sm text-muted-foreground">Belum diisi</span>
          )}
          {hasLocation ? (
            <a
              href={`https://www.google.com/maps?q=${user.registration_latitude},${user.registration_longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-primary hover:underline"
            >
              Lihat titik lokasi pendaftaran di peta
            </a>
          ) : null}
        </div>
      </div>

      {/* Separated from "Aksi Akun" on purpose. Recovery gives an account
          back; Tangguhkan and Hapus take it away. Sitting them in one row
          is how an admin trying to help a locked-out mitra ends up
          suspending them. */}
      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">Pemulihan Akses</p>
        <p className="mb-3 text-xs text-muted-foreground">
          Untuk pengguna yang tidak bisa masuk — terkunci karena salah password berkali-kali, atau
          lupa passwordnya.
        </p>
        <UserRecoveryActions
          userId={user.id}
          userName={user.full_name}
          lockedUntil={user.locked_until?.toISOString() ?? null}
          isSelf={user.id === session?.userId}
        />
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
