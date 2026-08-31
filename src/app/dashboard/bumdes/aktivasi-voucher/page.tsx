import { redirect } from "next/navigation";
import { CategoryPurchaseFlow } from "@/features/mitra-purchase";
import { getSession } from "@/lib/auth/session";
import { getCategoryPurchaseCatalog } from "@/services/catalog.service";
import { getWalletForMitraSession } from "@/services/wallet.service";

// Prices/stock reflect the live Digiflazz-synced catalog — never
// statically prerendered.
export const dynamic = "force-dynamic";

export default async function BumdesAktivasiVoucherPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [catalog, wallet] = await Promise.all([
    getCategoryPurchaseCatalog("Aktivasi Voucher"),
    getWalletForMitraSession(session.userId, session.roles),
  ]);

  return (
    <CategoryPurchaseFlow
      categoryName="Aktivasi Voucher"
      homeHref="/dashboard/bumdes/dashboard"
      brands={catalog.brands}
      products={catalog.products}
      productMarkups={catalog.productMarkups}
      verificationProductByBrandId={catalog.verificationProductByBrandId}
      availableBalance={wallet?.available_balance ?? "0"}
    />
  );
}
