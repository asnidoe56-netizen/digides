import { redirect } from "next/navigation";
import { MitraProfileView } from "@/features/mitra-account";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/repositories/user.repository";

export const dynamic = "force-dynamic";

export default async function BumdesProfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await findUserById(session.userId);
  if (!user) redirect("/login");

  return (
    <MitraProfileView
      backHref="/dashboard/bumdes/akun"
      fullName={user.full_name}
      email={user.email}
      phone={user.phone}
    />
  );
}
