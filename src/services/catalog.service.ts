import { listBrands, listCategories, listCheapestActiveProducts } from "@/repositories/product.repository";
import { getEffectiveMarkupsByProductId } from "@/services/pricing.service";
import type { Brand, Category, Product } from "@/types/product";

// A Digiflazz "Cek Nama Pengguna <Brand>" SKU (E-Money's account-holder
// name lookup) is a real row in `products` like any other, but it isn't a
// top-up a buyer picks a nominal for — it's a free inquiry the Verifikasi
// Pengguna feature calls instead (see verification.service.ts). Detected
// primarily via Digiflazz's own reported `provider_type` (populated by
// catalog-sync.ts since migration 026); products synced before that
// column existed, or from a provider that reports no type at all, fall
// back to matching the product_name pattern Digiflazz consistently uses
// for these SKUs.
export function isNameVerificationProduct(product: Pick<Product, "provider_type" | "product_name">): boolean {
  if (product.provider_type) {
    return product.provider_type.toLowerCase().includes("cek nama");
  }
  return /cek\s*nama/i.test(product.product_name);
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
