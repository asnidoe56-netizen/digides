import { redirect } from "next/navigation";
import { MitraChangePasswordView } from "@/features/mitra-account";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function KonterGantiPasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <MitraChangePasswordView backHref="/dashboard/konter/akun" />;
}
