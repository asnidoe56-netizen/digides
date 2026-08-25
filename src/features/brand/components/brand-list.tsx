import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BrandWithProductCount } from "@/repositories/product.repository";
import { BrandFormDialog } from "./brand-form-dialog";
import { BrandStatusToggle } from "./brand-status-toggle";

export function BrandList({ brands }: { brands: BrandWithProductCount[] }) {
  if (brands.length === 0) {
    return (
      <EmptyState
        title="Belum ada brand"
        description='Brand dibuat otomatis saat sinkronisasi katalog Digiflazz, atau klik "Tambah Brand".'
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {brands.map((brand) => (
          <div key={brand.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{brand.name}</p>
                <p className="text-xs text-muted-foreground">{brand.product_count} produk</p>
              </div>
              <StatusBadge status={brand.status} />
            </div>
            <div className="flex gap-2">
              <BrandFormDialog
                brand={brand}
                trigger={
                  <Button type="button" variant="outline" size="sm" className="h-9 flex-1 gap-2">
                    <Pencil className="size-3.5" />
                    Ubah
                  </Button>
                }
              />
              <BrandStatusToggle brand={brand} />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Brand</TableHead>
              <TableHead className="text-right">Jumlah Produk</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell className="font-medium">{brand.name}</TableCell>
                <TableCell className="text-right text-muted-foreground">{brand.product_count}</TableCell>
                <TableCell>
                  <StatusBadge status={brand.status} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <BrandFormDialog
                      brand={brand}
                      trigger={
                        <Button type="button" variant="outline" size="sm" className="h-9 gap-2">
                          <Pencil className="size-3.5" />
                          Ubah
                        </Button>
                      }
                    />
                    <BrandStatusToggle brand={brand} />
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
