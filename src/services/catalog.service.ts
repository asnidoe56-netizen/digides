import { listBrands, listCategories, listCheapestActiveProducts } from "@/repositories/product.repository";
import { getEffectiveMarkupsByProductId } from "@/services/pricing.service";
import type { Brand, Category, Product } from "@/types/product";

// A Digiflazz "Cek Nama Pengguna <Brand>" SKU (E-Money's account-holder
// name lookup) is a real row in `products` like any other, but it isn't a
// top-up a buyer picks a nominal for — it's a free inquiry the Verifikasi
// Pengguna feature calls instead (see verification.service.ts). Digiflazz
// does not reliably tag these with a distinctive `provider_type` in
// practice — real synced rows have come through as the same generic type
// ("Umum") an ordinary top-up gets, which made `provider_type` alone
// silently miss every verification SKU production actually syncs. The
// product_name pattern Digiflazz consistently uses for these SKUs is
// checked unconditionally now (not just as a fallback when provider_type
// is empty), with a same-intent provider_type match as a second, additive
// signal rather than a gate that can skip the name check entirely.
//
// "Cek Nama" isn't the only wording Digiflazz uses for this same kind of
// free inquiry SKU — Games brands sync theirs as "Cek Username" (confirmed
// in production: "Mobile Legends Cek Username"), which the "cek nama"-only
// pattern never matched, so it fell through and sat in the ordinary
// nominal list as a purchasable ~Rp6 product instead of driving Verifikasi
// Pengguna like its E-Money/PLN counterparts do. Matched here as a second,
// equally-valid alternative — additive, same as the provider_type check
// above, never a replacement for the original "cek nama" pattern.
export function isNameVerificationProduct(product: Pick<Product, "provider_type" | "product_name">): boolean {
  const providerType = product.provider_type?.toLowerCase();
  if (providerType?.includes("cek nama") || providerType?.includes("cek username")) {
    return true;
  }
  return /cek\s*(nama|username)/i.test(product.product_name);
}

export interface CategoryPurchaseCatalog {
  category: Category | null;
  brands: Brand[];
  /** Purchasable top-ups only — never includes a "Cek Nama" inquiry SKU;
   *  see verificationProductByBrandId for those. */
  products: Product[];
  /** product_id -> its effective markup (PRODUCT > BRAND > CATEGORY >
   *  GLOBAL, whichever is most specific) — the exact same resolver
   *  transaction.service.ts's executeTransaction charges with, so the
   *  price shown here always matches what a purchase actually costs. */
  productMarkups: Record<string, string>;
  /** brand_id -> the product_id of that brand's "Cek Nama Pengguna" SKU,
   *  for brands that have one. The Verifikasi Pengguna card (mitra-
   *  purchase's CategoryPurchaseFlow) looks up the selected brand here to
   *  decide whether verification is even available for it. */
  verificationProductByBrandId: Record<string, string>;
}

// The buyer-facing catalog for one category (Pulsa today, Data/PLN/etc.
// next) — only brands that actually have an active product in this
// category, never the full brand list.
export async function getCategoryPurchaseCatalog(categoryName: string): Promise<CategoryPurchaseCatalog> {
  const categories = await listCategories();
  const category = categories.find((item) => item.name === categoryName) ?? null;

  if (!category || category.status !== "ACTIVE") {
    return { category: null, brands: [], products: [], productMarkups: {}, verificationProductByBrandId: {} };
  }

  const [allProducts, allBrands] = await Promise.all([
    listCheapestActiveProducts({ categoryId: category.id, excludeAdminDisabled: true, limit: 200 }),
    listBrands(),
  ]);

  const products = allProducts.filter((product) => !isNameVerificationProduct(product));

  const verificationProductByBrandId: Record<string, string> = {};
  for (const product of allProducts) {
    if (isNameVerificationProduct(product) && product.brand_id) {
      verificationProductByBrandId[product.brand_id] = product.id;
    }
  }

  const productMarkups = await getEffectiveMarkupsByProductId(products.map((product) => product.id));

  const brandIdsWithProducts = new Set(products.map((product) => product.brand_id));
  const brands = allBrands.filter((brand) => brand.status === "ACTIVE" && brandIdsWithProducts.has(brand.id));

  return { category, brands, products, productMarkups, verificationProductByBrandId };
}
