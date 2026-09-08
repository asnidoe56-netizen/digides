import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/formatting/money";
import type { StoreListItem } from "@/repositories/store.repository";
import { StoreCard } from "./store-card";
import { StoreVerifyAction } from "./store-verify-action";

export interface StoreListProps {
  stores: StoreListItem[];
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// Same "one data source, two presentations" pattern as UserList/ProductList
// — card grid through tablet, table from `lg:` up.
export function StoreList({ stores }: StoreListProps) {
  if (stores.length === 0) {
    return (
      <EmptyState
        title="Belum ada toko yang cocok"
        description="Ubah filter status atau kata kunci pencarian."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Toko</TableHead>
              <TableHead>Pemilik</TableHead>
              <TableHead>Didaftarkan</TableHead>
              <TableHead>Saldo Toko</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stores.map((store) => (
              <TableRow key={store.id}>
                <TableCell className="font-medium">{store.name}</TableCell>
                <TableCell>
                  <span className="block">{store.owner_name}</span>
                  <span className="block text-xs text-muted-foreground">{store.owner_email}</span>
                </TableCell>
                <TableCell className="text-sm">
                  {dateFormatter.format(new Date(store.created_at))}
                </TableCell>
                <TableCell>{formatMoney(store.wallet_balance)}</TableCell>
                <TableCell>
                  <StatusBadge status={store.status} />
                </TableCell>
                <TableCell>
                  <StoreVerifyAction
                    storeId={store.id}
                    storeName={store.name}
                    ownerName={store.owner_name}
                    status={store.status}
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
