import { PageHeader } from "@/components/page-header";
import { CategoryMarkupList } from "@/features/markup";
import { getCategoryMarkups } from "@/services/pricing.service";

// Markup values change how much agents pay right now — never statically
// cached, same reasoning as every other pricing/balance-driven page.
export const dynamic = "force-dynamic";

export default async function SuperAdminMarkupPage() {
  const categories = await getCategoryMarkups();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Markup"
        description="Atur tambahan harga (Rupiah) per kategori di atas harga dasar Digiflazz. Perubahan langsung berlaku pada harga yang dilihat agen."
      />
      <CategoryMarkupList categories={categories} />
    </div>
  );
}
