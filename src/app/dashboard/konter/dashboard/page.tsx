import { redirect } from "next/navigation";
import { MitraHomeView } from "@/features/mitra-home";
import { getSession } from "@/lib/auth/session";
import { listCategories } from "@/repositories/product.repository";
import { findUserById } from "@/repositories/user.repository";
import { getWalletForMitraSession } from "@/services/wallet.service";

// Balance and notification state change constantly — never statically
// prerendered, same reasoning as every admin data page.
export const dynamic = "force-dynamic";

const CATEGORY_HREFS = { Pulsa: "/dashboard/konter/pulsa" };

export default async function KonterDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, wallet, categories] = await Promise.all([
    findUserById(session.userId),
    getWalletForMitraSession(session.userId, session.roles),
    listCategories(),
  ]);

  return (
    <MitraHomeView
      fullName={user?.full_name ?? ""}
      roleLabel="Agen"
      availableBalance={wallet?.available_balance ?? "0"}
      heldBalance={wallet?.held_balance ?? "0"}
      categories={categories}
      categoryHrefs={CATEGORY_HREFS}
      homeHref="/dashboard/konter/dashboard"
    />
  );
}
