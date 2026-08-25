import { Pencil } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CategoryMarkup } from "@/repositories/product.repository";
import { CategoryMarkupEditDialog } from "./category-markup-edit-dialog";

export interface CategoryMarkupListProps {
  categories: CategoryMarkup[];
}

// Same table→card responsive pattern as every other list in the app (one
// data source, two presentations toggled purely by breakpoint).
export function CategoryMarkupList({ categories }: CategoryMarkupListProps) {
  if (categories.length === 0) {
    return (
      <EmptyState
        title="Belum ada kategori"
        description="Kategori dibuat otomatis saat katalog Digiflazz disinkronkan dari halaman Produk."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {categories.map((category) => (
          <div key={category.category_id} className="flex items-center justify-between gap-3 rounded-lg border p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{category.category_name}</p>
              <p className="text-xs text-muted-foreground">Markup saat ini</p>
              <MoneyDisplay amount={category.markup_value} size="md" />
            </div>
            <CategoryMarkupEditDialog
              category={category}
              trigger={
                <Button type="button" variant="outline" size="icon" className="size-11 shrink-0" aria-label="Ubah markup">
                  <Pencil className="size-4" />
                </Button>
              }
            />
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Markup</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.category_id}>
                <TableCell className="font-medium">{category.category_name}</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amount={category.markup_value} size="sm" />
                </TableCell>
                <TableCell>
                  <CategoryMarkupEditDialog
                    category={category}
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
