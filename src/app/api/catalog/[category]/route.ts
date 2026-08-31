import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCategoryPurchaseCatalog } from "@/services/catalog.service";

// The mobile app's counterpart to what each Konter category page (Pulsa,
// PLN, ...) already fetches server-side via getCategoryPurchaseCatalog —
// same buyer-facing catalog (only brands with an active product in this
// category, product_id -> effective markup), just exposed as JSON for a
// non-Next.js client. Read-only, any logged-in session.
export async function GET(_request: Request, { params }: { params: Promise<{ category: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { category } = await params;
  const catalog = await getCategoryPurchaseCatalog(decodeURIComponent(category));
  return NextResponse.json(catalog);
}
