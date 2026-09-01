import { redirect } from "next/navigation";
import { MitraAccountView } from "@/features/mitra-account";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/repositories/user.repository";

export const dynamic = "force-dynamic";

export default async function BumdesAkunPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await findUserById(session.userId);

  return (
    <MitraAccountView
      fullName={user?.full_name ?? ""}
      roleLabel="Mitra"
      profilHref="/dashboard/bumdes/akun/profil"
      perangkatHref="/dashboard/bumdes/akun/perangkat"
      gantiPasswordHref="/dashboard/bumdes/akun/ganti-password"
      gantiPinHref="/dashboard/bumdes/akun/ganti-pin"
      keamananHref="/dashboard/bumdes/akun/keamanan"
    />
  );
}
