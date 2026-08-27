import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import { BulkMarkupDialog, CategoryMarkupList, MarkupTabs, ProductMarkupList, type MarkupTabKey } from "@/features/markup";
import { ProductFilters } from "@/features/products";
import { countProducts, listBrands, listCategories, listCategoryBrandPairs } from "@/repositories/product.repository";
import { getCategoryMarkups, getProductMarkups } from "@/services/pricing.service";
import type { ProductStatus } from "@/types/product";

const PAGE_SIZE = 20;

// Markup values change how much agents pay right now — never statically
// cached, same reasoning as every other pricing/balance-driven page.
export const dynamic = "force-dynamic";

interface SuperAdminMarkupPageProps {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    category?: string;
    brand?: string;
    status?: string;
    page?: string;
  }>;
}

type ProductMarkupTabParams = {
  search?: string;
  category?: string;
  brand?: string;
  status?: string;
  page?: string;
};

export default async function SuperAdminMarkupPage({ searchParams }: SuperAdminMarkupPageProps) {
  const params = await searchParams;
  const tab: MarkupTabKey = params.tab === "produk" ? "produk" : "kategori";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Markup"
        description="Atur tambahan harga (Rupiah) di atas harga dasar Digiflazz — per kategori, atau per produk/provider untuk pengaturan yang lebih presisi."
      />

      <MarkupTabs active={tab} />

      {tab === "kategori" ? <CategoryMarkupTab /> : <ProductMarkupTab params={params} />}
    </div>
  );
}

async function CategoryMarkupTab() {
  const categories = await getCategoryMarkups();
  return <CategoryMarkupList categories={categories} />;
}

// "Per Produk" — the same category/provider/status filter as the Produk
// page, but listing each product's own markup override (with a per-row
// edit) plus a bulk-apply action for the whole filtered set at once.
async function ProductMarkupTab({ params }: { params: ProductMarkupTabParams }) {
  const page = Math.max(1, Number(params.page) || 1);

  const filter = {
    search: params.search || undefined,
    categoryId: params.category || undefined,
    brandId: params.brand || undefined,
    status: (params.status as ProductStatus | undefined) || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [products, total, categories, brands, categoryBrandPairs] = await Promise.all([
    getProductMarkups(filter),
    countProducts(filter),
    listCategories(),
    listBrands(),
    listCategoryBrandPairs(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(targetPage: number): string {
    const query = new URLSearchParams();
    query.set("tab", "produk");
    if (params.search) query.set("search", params.search);
    if (params.category) query.set("category", params.category);
    if (params.brand) query.set("brand", params.brand);
    if (params.status) query.set("status", params.status);
    if (targetPage > 1) query.set("page", String(targetPage));
    return `/dashboard/super-admin/markup?${query.toString()}`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <ProductFilters categories={categories} brands={brands} categoryBrandPairs={categoryBrandPairs} />
        </div>
        <BulkMarkupDialog categories={categories} brands={brands} affectedCount={total} />
      </div>

      <ProductMarkupList products={products} categories={categories} brands={brands} />
      <PaginationControls page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
