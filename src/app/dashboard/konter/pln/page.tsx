import { redirect } from "next/navigation";
import { CategoryPurchaseFlow, NUMERIC_ID_FIELD } from "@/features/mitra-purchase";
import { getSession } from "@/lib/auth/session";
import { getCategoryPurchaseCatalog } from "@/services/catalog.service";
import { getWalletForMitraSession } from "@/services/wallet.service";

// Prices/stock reflect the live Digiflazz-synced catalog — never
// statically prerendered.
export const dynamic = "force-dynamic";

// Token PLN prepaid is bought against the customer's ID Pelanggan/No.
// Meter, never a phone number.
const PLN_ID_FIELD = { ...NUMERIC_ID_FIELD, label: "ID Pelanggan / No. Meter" };

export default async function KonterPlnPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [catalog, wallet] = await Promise.all([
    getCategoryPurchaseCatalog("PLN"),
    getWalletForMitraSession(session.userId, session.roles),
  ]);

  return (
    <CategoryPurchaseFlow
      categoryName="PLN"
      homeHref="/dashboard/konter/dashboard"
      brands={catalog.brands}
      products={catalog.products}
      productMarkups={catalog.productMarkups}
      availableBalance={wallet?.available_balance ?? "0"}
      customerIdField={PLN_ID_FIELD}
    />
  );
}
