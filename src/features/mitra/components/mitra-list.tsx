import { Send } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { BumdesWithDetail } from "@/repositories/bumdes.repository";
import { MitraTopupDialog } from "./mitra-topup-dialog";

export interface MitraListProps {
  mitra: BumdesWithDetail[];
}

// Same table→card responsive pattern as every other list (Wallet
// Accounts, Products, Users): one data source, two presentations
// toggled purely by breakpoint.
export function MitraList({ mitra }: MitraListProps) {
  if (mitra.length === 0) {
    return (
      <EmptyState
        title="Belum ada mitra"
        description='Klik "Daftarkan Mitra" untuk menambahkan BUMDes/mitra pertama.'
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {mitra.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{item.name}</p>
                <p className="truncate text-sm text-muted-foreground">{item.admin_email}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo</p>
              <MoneyDisplay amount={item.available_balance} size="md" />
            </div>
            <MitraTopupDialog
              bumdesId={item.id}
              mitraName={item.name}
              trigger={
                <Button type="button" variant="outline" className="h-11 w-full gap-2">
                  <Send className="size-4" />
                  Kirim Saldo
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
              <TableHead>Nama Mitra</TableHead>
              <TableHead>Email Admin</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {mitra.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-muted-foreground">{item.admin_email}</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amount={item.available_balance} size="sm" />
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell>
                  <MitraTopupDialog
                    bumdesId={item.id}
                    mitraName={item.name}
                    trigger={
                      <Button type="button" variant="outline" size="sm" className="h-9 gap-2">
                        <Send className="size-3.5" />
                        Kirim Saldo
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
