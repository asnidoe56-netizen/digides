import { Pencil } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProductMarkupRow } from "@/repositories/product.repository";
import type { Brand, Category } from "@/types/product";
import { ProductMarkupEditDialog } from "./product-markup-edit-dialog";

export interface ProductMarkupListProps {
  products: ProductMarkupRow[];
  categories: Category[];
  brands: Brand[];
}

// Same table→card responsive pattern as ProductList/CategoryMarkupList —
// one data source, two presentations toggled purely by breakpoint.
export function ProductMarkupList({ products, categories, brands }: ProductMarkupListProps) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="Belum ada produk yang cocok"
        description="Pilih kategori dan/atau provider dari Filter untuk melihat produknya di sini."
      />
    );
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const brandNameById = new Map(brands.map((brand) => [brand.id, brand.name]));

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {products.map((product) => (
          <div key={product.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{product.product_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {product.category_id ? (categoryNameById.get(product.category_id) ?? "-") : "-"} ·{" "}
                {product.brand_id ? (brandNameById.get(product.brand_id) ?? "-") : "-"}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {product.product_markup_value !== null ? "Markup produk" : "Markup saat ini"}
                </p>
                <MoneyDisplay amount={product.effective_markup_value} size="md" />
              </div>
              <ProductMarkupEditDialog
                product={product}
                trigger={
                  <Button type="button" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Ubah markup">
                    <Pencil className="size-4" />
                  </Button>
                }
              />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead className="text-right">Harga Dasar</TableHead>
              <TableHead className="text-right">Markup Saat Ini</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.product_name}</TableCell>
                <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                <TableCell>{product.category_id ? (categoryNameById.get(product.category_id) ?? "-") : "-"}</TableCell>
                <TableCell>{product.brand_id ? (brandNameById.get(product.brand_id) ?? "-") : "-"}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  <MoneyDisplay amount={product.base_price} size="sm" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end">
                    <MoneyDisplay amount={product.effective_markup_value} size="sm" />
                    <span className="text-xs text-muted-foreground">
                      {product.product_markup_value !== null ? "Override produk" : "Dari kategori/brand"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <ProductMarkupEditDialog
                    product={product}
                    trigger={
                      <Button type="button" variant="outline" size="sm" className="h-9 gap-2">
                        <Pencil className="size-3.5" />
                        Ubah
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
