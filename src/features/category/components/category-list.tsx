import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CategoryWithProductCount } from "@/repositories/product.repository";
import { CategoryFormDialog } from "./category-form-dialog";
import { CategoryStatusToggle } from "./category-status-toggle";

export function CategoryList({ categories }: { categories: CategoryWithProductCount[] }) {
  if (categories.length === 0) {
    return (
      <EmptyState
        title="Belum ada kategori"
        description='Kategori dibuat otomatis saat sinkronisasi katalog Digiflazz, atau klik "Tambah Kategori".'
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {categories.map((category) => (
          <div key={category.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{category.name}</p>
                <p className="text-xs text-muted-foreground">{category.product_count} produk</p>
              </div>
              <StatusBadge status={category.status} />
            </div>
            <div className="flex gap-2">
              <CategoryFormDialog
                category={category}
                trigger={
                  <Button type="button" variant="outline" size="sm" className="h-9 flex-1 gap-2">
                    <Pencil className="size-3.5" />
                    Ubah
                  </Button>
                }
              />
              <CategoryStatusToggle category={category} />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Kategori</TableHead>
              <TableHead className="text-right">Jumlah Produk</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-right text-muted-foreground">{category.product_count}</TableCell>
                <TableCell>
                  <StatusBadge status={category.status} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <CategoryFormDialog
                      category={category}
                      trigger={
                        <Button type="button" variant="outline" size="sm" className="h-9 gap-2">
                          <Pencil className="size-3.5" />
                          Ubah
                        </Button>
                      }
                    />
                    <CategoryStatusToggle category={category} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
