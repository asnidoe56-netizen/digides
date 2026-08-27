import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { ProductFilters, ProductList, SyncCatalogButton } from "@/features/products";
import {
  countProducts,
  listBrands,
  listCategories,
  listCategoryBrandPairs,
  listProducts,
} from "@/repositories/product.repository";
import { getCategoryMarkups } from "@/services/pricing.service";
import type { ProductStatus } from "@/types/product";

const PAGE_SIZE = 20;

// Product counts/status change every time an admin syncs the catalog —
// never statically prerendered (same reasoning as the dashboard page).
export const dynamic = "force-dynamic";

interface SuperAdminProductsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    brand?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function SuperAdminProductsPage({ searchParams }: SuperAdminProductsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const filter = {
    search: params.search || undefined,
    categoryId: params.category || undefined,
    brandId: params.brand || undefined,
    status: (params.status as ProductStatus | undefined) || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  // Server Component reads straight from the repository — same reasoning
  // as the dashboard page, no self-fetch to /api/* needed for a read.
  const [products, total, categories, brands, categoryBrandPairs, categoryMarkups] = await Promise.all([
    listProducts(filter),
    countProducts(filter),
    listCategories(),
    listBrands(),
    listCategoryBrandPairs(),
    getCategoryMarkups(),
  ]);

  const markupByCategoryId = new Map(categoryMarkups.map((entry) => [entry.category_id, Number(entry.markup_value)]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(targetPage: number): string {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.category) query.set("category", params.category);
    if (params.brand) query.set("brand", params.brand);
    if (params.status) query.set("status", params.status);
    if (targetPage > 1) query.set("page", String(targetPage));
    const queryString = query.toString();
    return `/dashboard/super-admin/products${queryString ? `?${queryString}` : ""}`;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Produk" description={`${total} produk dari katalog Digiflazz`} />

      <SyncCatalogButton />
      <ProductFilters categories={categories} brands={brands} categoryBrandPairs={categoryBrandPairs} />
      <ProductList
        products={products}
        categories={categories}
        brands={brands}
        markupByCategoryId={markupByCategoryId}
        startIndex={(page - 1) * PAGE_SIZE}
      />
      <PaginationControls page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
