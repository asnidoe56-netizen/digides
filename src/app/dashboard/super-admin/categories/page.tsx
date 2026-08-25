import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CategoryFormDialog, CategoryList } from "@/features/category";
import { getCategories } from "@/services/category.service";

// Product counts change whenever the catalog syncs — never statically
// cached, same reasoning as the Products page.
export const dynamic = "force-dynamic";

export default async function SuperAdminCategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kategori"
        description="Kelola kategori produk. Menonaktifkan kategori menghentikan pembelian baru untuk produk di dalamnya."
        actions={
          <CategoryFormDialog
            trigger={
              <Button type="button" className="h-11">
                Tambah Kategori
              </Button>
            }
          />
        }
      />
      <CategoryList categories={categories} />
    </div>
  );
}
