import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { BrandFormDialog, BrandList } from "@/features/brand";
import { getBrands } from "@/services/brand.service";

// Product counts change whenever the catalog syncs — never statically
// cached, same reasoning as the Categories and Products pages.
export const dynamic = "force-dynamic";

export default async function SuperAdminBrandsPage() {
  const brands = await getBrands();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Brand"
        description="Kelola brand produk. Menonaktifkan brand menghentikan pembelian baru untuk produk di dalamnya."
        actions={
          <BrandFormDialog
            trigger={
              <Button type="button" className="h-11">
                Tambah Brand
              </Button>
            }
          />
        }
      />
      <BrandList brands={brands} />
    </div>
  );
}
