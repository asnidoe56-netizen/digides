import { getCategoryMarkupValue, listBrands, listCategories, listProducts } from "@/repositories/product.repository";
import type { Brand, Category, Product } from "@/types/product";

export interface CategoryPurchaseCatalog {
  category: Category | null;
  brands: Brand[];
  products: Product[];
  categoryMarkup: string;
}

// The buyer-facing catalog for one category (Pulsa today, Data/PLN/etc.
// next) — only brands that actually have an active product in this
// category, never the full brand list, and the same category-level
// markup transaction.service.ts's executeTransaction() applies, so the
// price shown here is exactly what a purchase would charge.
export async function getCategoryPurchaseCatalog(categoryName: string): Promise<CategoryPurchaseCatalog> {
  const categories = await listCategories();
  const category = categories.find((item) => item.name === categoryName) ?? null;

  if (!category || category.status !== "ACTIVE") {
    return { category: null, brands: [], products: [], categoryMarkup: "0" };
  }

  const [products, allBrands, categoryMarkup] = await Promise.all([
    listProducts({ categoryId: category.id, status: "ACTIVE", limit: 200 }),
    listBrands(),
    getCategoryMarkupValue(category.id),
  ]);

  const brandIdsWithProducts = new Set(products.map((product) => product.brand_id));
  const brands = allBrands.filter((brand) => brand.status === "ACTIVE" && brandIdsWithProducts.has(brand.id));

  return { category, brands, products, categoryMarkup };
}
