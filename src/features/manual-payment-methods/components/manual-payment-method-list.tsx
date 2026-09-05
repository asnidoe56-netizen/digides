import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ManualPaymentMethod } from "@/types/manual-payment-method";
import { ManualPaymentMethodEditDialog } from "./manual-payment-method-edit-dialog";
import { ManualPaymentMethodStatusToggle } from "./manual-payment-method-status-toggle";

export interface ManualPaymentMethodListProps {
  methods: ManualPaymentMethod[];
}

const UNCONFIGURED = "BELUM DIATUR";

export function ManualPaymentMethodList({ methods }: ManualPaymentMethodListProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {methods.map((method) => {
          const configured = method.account_number !== UNCONFIGURED;
          return (
            <div key={method.id} className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{method.display_name}</p>
                <Badge variant={method.is_active ? "default" : "outline"}>
                  {method.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
              <div className="text-sm">
                <p className={configured ? "font-medium" : "text-muted-foreground italic"}>
                  {method.account_number}
                </p>
                <p className="text-xs text-muted-foreground">{method.account_name}</p>
              </div>
              <div className="flex gap-2">
                <ManualPaymentMethodEditDialog
                  method={method}
                  trigger={
                    <Button type="button" variant="outline" size="sm" className="h-9 flex-1 gap-2">
                      <Pencil className="size-3.5" />
                      Ubah
                    </Button>
                  }
                />
                <ManualPaymentMethodStatusToggle id={method.id} isActive={method.is_active} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metode</TableHead>
              <TableHead>Nomor</TableHead>
              <TableHead>Nama Pemilik</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {methods.map((method) => {
              const configured = method.account_number !== UNCONFIGURED;
              return (
                <TableRow key={method.id}>
                  <TableCell className="font-medium">{method.display_name}</TableCell>
                  <TableCell className={configured ? "" : "text-muted-foreground italic"}>
                    {method.account_number}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{method.account_name}</TableCell>
                  <TableCell>
                    <Badge variant={method.is_active ? "default" : "outline"}>
                      {method.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <ManualPaymentMethodEditDialog
                        method={method}
                        trigger={
                          <Button type="button" variant="outline" size="sm" className="h-9 gap-2">
                            <Pencil className="size-3.5" />
                            Ubah
                          </Button>
                        }
                      />
                      <ManualPaymentMethodStatusToggle id={method.id} isActive={method.is_active} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
