import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listStoreProductCategories } from "@/repositories/store-product-category.repository";

// The shared fixed list (PRD Kasir Pintar §6.2), feeding both the product
// form's category picker and the cashier's category tabs.
//
// Read-only, and there is no POST here on purpose: the list belongs to the
// platform, not to any one warung. Adding to it is a migration — the right
// amount of friction for a change that lands in every store at once.
//
// Only ACTIVE categories are returned: a category retired later should
// stop being offered without invalidating the products already filed under
// it, which still resolve their own category by id.
//
// Session-gated but not role-gated: every logged-in mitra either has a
// warung or may register one, and the list carries nothing store-specific.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    const categories = await listStoreProductCategories({ onlyActive: true });
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat kategori." },
      { status: 400 },
    );
  }
}
