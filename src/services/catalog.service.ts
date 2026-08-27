import { listBrands, listCategories, listCheapestActiveProducts } from "@/repositories/product.repository";
import { getEffectiveMarkupsByProductId } from "@/services/pricing.service";
import type { Brand, Category, Product } from "@/types/product";

export interface CategoryPurchaseCatalog {
  category: Category | null;
  brands: Brand[];
  products: Product[];
  /** product_id -> its effective markup (PRODUCT > BRAND > CATEGORY >
   *  GLOBAL, whichever is most specific) — the exact same resolver
   *  transaction.service.ts's executeTransaction charges with, so the
   *  price shown here always matches what a purchase actually costs. */
  productMarkups: Record<string, string>;
}

// The buyer-facing catalog for one category (Pulsa today, Data/PLN/etc.
// next) — only brands that actually have an active product in this
// category, never the full brand list.
export async function getCategoryPurchaseCatalog(categoryName: string): Promise<CategoryPurchaseCatalog> {
  const categories = await listCategories();
  const category = categories.find((item) => item.name === categoryName) ?? null;

  if (!category || category.status !== "ACTIVE") {
    return { category: null, brands: [], products: [], productMarkups: {} };
  }

  const [products, allBrands] = await Promise.all([
    listCheapestActiveProducts({ categoryId: category.id, excludeAdminDisabled: true, limit: 200 }),
    listBrands(),
  ]);

  const productMarkups = await getEffectiveMarkupsByProductId(products.map((product) => product.id));

  const brandIdsWithProducts = new Set(products.map((product) => product.brand_id));
  const brands = allBrands.filter((brand) => brand.status === "ACTIVE" && brandIdsWithProducts.has(brand.id));

  return { category, brands, products, productMarkups };
}
