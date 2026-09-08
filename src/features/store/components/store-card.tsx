import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/formatting/money";
import type { StoreListItem } from "@/repositories/store.repository";
import { StoreVerifyAction } from "./store-verify-action";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// The card half of StoreList's responsive pair (below `lg:`).
export function StoreCard({ store }: { store: StoreListItem }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{store.name}</p>
            <p className="truncate text-sm text-muted-foreground">{store.owner_name}</p>
          </div>
          <StatusBadge status={store.status} />
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Didaftarkan</dt>
            <dd>{dateFormatter.format(new Date(store.created_at))}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Saldo Toko</dt>
            <dd>{formatMoney(store.wallet_balance)}</dd>
          </div>
        </dl>

        {store.address_detail ? (
          <p className="text-xs text-muted-foreground">{store.address_detail}</p>
        ) : null}

        <StoreVerifyAction
          storeId={store.id}
          storeName={store.name}
          ownerName={store.owner_name}
          status={store.status}
        />
      </CardContent>
    </Card>
  );
}
