import { redirect } from "next/navigation";
import { MitraSecurityView } from "@/features/mitra-account";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function BumdesKeamananPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <MitraSecurityView backHref="/dashboard/bumdes/akun" />;
}
