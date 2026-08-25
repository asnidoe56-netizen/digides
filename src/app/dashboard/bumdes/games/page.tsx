import { redirect } from "next/navigation";
import { CategoryPurchaseFlow, type CustomerIdFieldConfig } from "@/features/mitra-purchase";
import { getSession } from "@/lib/auth/session";
import { getCategoryPurchaseCatalog } from "@/services/catalog.service";
import { getWalletForMitraSession } from "@/services/wallet.service";

// Prices/stock reflect the live Digiflazz-synced catalog — never
// statically prerendered.
export const dynamic = "force-dynamic";

// Games key off a numeric player ID, not a phone number — some games
// (Mobile Legends) also need a zone ID, entered in parentheses right
// after the player ID (e.g. "123456789(1001)"), the same convention most
// PPOB apps use since Digiflazz has no separate zone_id field.
const GAME_ID_FIELD: CustomerIdFieldConfig = {
  label: "ID Game",
  placeholder: "Contoh: 123456789 atau 123456789(1001)",
  pattern: "^[0-9]{5,15}(\\([0-9]{1,6}\\))?$",
  invalidMessage: "ID Game tidak valid.",
  helperMessage:
    "Isi ID Game yang valid untuk memilih provider. Untuk game yang butuh Zone ID (seperti Mobile Legends), gunakan format ID(ZoneID).",
};

export default async function BumdesGamesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [catalog, wallet] = await Promise.all([
    getCategoryPurchaseCatalog("Games"),
    getWalletForMitraSession(session.userId, session.roles),
  ]);

  return (
    <CategoryPurchaseFlow
      categoryName="Games"
      homeHref="/dashboard/bumdes/dashboard"
      brands={catalog.brands}
      products={catalog.products}
      categoryMarkup={catalog.categoryMarkup}
      availableBalance={wallet?.available_balance ?? "0"}
      customerIdField={GAME_ID_FIELD}
    />
  );
}
