import { redirect } from "next/navigation";
import { MitraChangePinView } from "@/features/mitra-account";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function KonterGantiPinPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <MitraChangePinView backHref="/dashboard/konter/akun" />;
}
