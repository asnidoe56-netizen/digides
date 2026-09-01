import { redirect } from "next/navigation";
import { MitraChangePinView } from "@/features/mitra-account";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function BumdesGantiPinPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <MitraChangePinView backHref="/dashboard/bumdes/akun" />;
}
