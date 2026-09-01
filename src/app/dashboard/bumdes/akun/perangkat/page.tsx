import { redirect } from "next/navigation";
import { MitraDeviceView } from "@/features/mitra-account";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function BumdesPerangkatPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <MitraDeviceView backHref="/dashboard/bumdes/akun" keamananHref="/dashboard/bumdes/akun/keamanan" />;
}
