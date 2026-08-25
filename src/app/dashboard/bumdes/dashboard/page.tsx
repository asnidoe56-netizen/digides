import { redirect } from "next/navigation";
import { MitraHomeView } from "@/features/mitra-home";
import { getSession } from "@/lib/auth/session";
import { listCategories } from "@/repositories/product.repository";
import { findUserById } from "@/repositories/user.repository";
import { getWalletForMitraSession } from "@/services/wallet.service";

// Balance and notification state change constantly — never statically
// prerendered, same reasoning as every admin data page.
export const dynamic = "force-dynamic";

const CATEGORY_HREFS = {
  Pulsa: "/dashboard/bumdes/pulsa",
  "E-Money": "/dashboard/bumdes/e-money",
  PLN: "/dashboard/bumdes/pln",
  "Paket SMS & Telpon": "/dashboard/bumdes/paket-sms-telpon",
  Data: "/dashboard/bumdes/data",
  "Aktivasi Voucher": "/dashboard/bumdes/aktivasi-voucher",
  "Aktivasi Perdana": "/dashboard/bumdes/aktivasi-perdana",
  Games: "/dashboard/bumdes/games",
  "Masa Aktif": "/dashboard/bumdes/masa-aktif",
  TV: "/dashboard/bumdes/tv",
  Gas: "/dashboard/bumdes/gas",
  Voucher: "/dashboard/bumdes/voucher",
};

const ACTION_HREFS = {
  Transfer: "/dashboard/bumdes/transfer",
  Histori: "/dashboard/bumdes/histori",
};

export default async function BumdesDashboardPage() {
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
      roleLabel="Mitra"
      availableBalance={wallet?.available_balance ?? "0"}
      heldBalance={wallet?.held_balance ?? "0"}
      categories={categories}
      categoryHrefs={CATEGORY_HREFS}
      actionHrefs={ACTION_HREFS}
    />
  );
}
