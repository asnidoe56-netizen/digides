import { redirect } from "next/navigation";
import { MitraAccountView } from "@/features/mitra-account";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/repositories/user.repository";

export const dynamic = "force-dynamic";

export default async function KonterAkunPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await findUserById(session.userId);

  return (
    <MitraAccountView
      fullName={user?.full_name ?? ""}
      roleLabel="Agen"
      profilHref="/dashboard/konter/akun/profil"
      perangkatHref="/dashboard/konter/akun/perangkat"
      gantiPasswordHref="/dashboard/konter/akun/ganti-password"
      gantiPinHref="/dashboard/konter/akun/ganti-pin"
      keamananHref="/dashboard/konter/akun/keamanan"
    />
  );
}
