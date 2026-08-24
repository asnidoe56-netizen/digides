import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Brand, Category, Product } from "@/types/product";
import { ProductCard } from "./product-card";

export interface ProductListProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
}

// One data source, two presentations toggled purely by breakpoint — a
// card list on mobile (ProductCard), a table on desktop — so they can
// never drift out of sync with each other (issue M03 section 5, "Mobile:
// Card/List, Desktop: Table/Grid").
export function ProductList({ products, categories, brands }: ProductListProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="Belum ada produk yang cocok"
        description='Klik "Sinkronkan Sekarang" untuk menarik daftar harga terbaru dari Digiflazz, atau ubah kata kunci/filter pencarian.'
      />
    );
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const brandNameById = new Map(brands.map((brand) => [brand.id, brand.name]));

  return (
    <>
      {/* Card grid for mobile through tablet — 1 column on a phone, 2 on
          a tablet's wider viewport, so a tablet gets its own layout
          instead of a phone layout just stretched wider. Switches to the
          table entirely at `lg:`, where there's room for real columns. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            categoryName={product.category_id ? (categoryNameById.get(product.category_id) ?? null) : null}
            brandName={product.brand_id ? (brandNameById.get(product.brand_id) ?? null) : null}
          />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.product_name}</TableCell>
                <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                <TableCell>
                  {product.category_id ? (categoryNameById.get(product.category_id) ?? "-") : "-"}
                </TableCell>
                <TableCell>{product.brand_id ? (brandNameById.get(product.brand_id) ?? "-") : "-"}</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amount={product.base_price} size="sm" />
                </TableCell>
                <TableCell>
                  <StatusBadge status={product.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
