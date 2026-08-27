import { redirect } from "next/navigation";
import { CategoryPurchaseFlow, NUMERIC_ID_FIELD } from "@/features/mitra-purchase";
import { getSession } from "@/lib/auth/session";
import { getCategoryPurchaseCatalog } from "@/services/catalog.service";
import { getWalletForMitraSession } from "@/services/wallet.service";

// Prices/stock reflect the live Digiflazz-synced catalog — never
// statically prerendered.
export const dynamic = "force-dynamic";

// Pay-TV top-up (K-Vision/GOL) is identified by the decoder's ID
// pelanggan/nomor kartu, not a phone number.
const TV_ID_FIELD = { ...NUMERIC_ID_FIELD, label: "ID Pelanggan / No. Kartu" };

export default async function BumdesTvPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [catalog, wallet] = await Promise.all([
    getCategoryPurchaseCatalog("TV"),
    getWalletForMitraSession(session.userId, session.roles),
  ]);

  return (
    <CategoryPurchaseFlow
      categoryName="TV"
      homeHref="/dashboard/bumdes/dashboard"
      brands={catalog.brands}
      products={catalog.products}
      productMarkups={catalog.productMarkups}
      availableBalance={wallet?.available_balance ?? "0"}
      customerIdField={TV_ID_FIELD}
    />
  );
}
