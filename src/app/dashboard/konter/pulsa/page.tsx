import { redirect } from "next/navigation";
import { PulsaFlow } from "@/features/mitra-pulsa";
import { getSession } from "@/lib/auth/session";
import { getCategoryPurchaseCatalog } from "@/services/catalog.service";
import { getWalletForMitraSession } from "@/services/wallet.service";

// Prices/stock reflect the live Digiflazz-synced catalog — never
// statically prerendered.
export const dynamic = "force-dynamic";

export default async function KonterPulsaPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [catalog, wallet] = await Promise.all([
    getCategoryPurchaseCatalog("Pulsa"),
    getWalletForMitraSession(session.userId, session.roles),
  ]);

  return (
    <PulsaFlow
      homeHref="/dashboard/konter/dashboard"
      brands={catalog.brands}
      products={catalog.products}
      categoryMarkup={catalog.categoryMarkup}
      availableBalance={wallet?.available_balance ?? "0"}
    />
  );
}
