import { MoneyDisplay } from "@/components/money-display";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/formatting/money";
import type { Product } from "@/types/product";

export interface ProductCardProps {
  product: Product;
  categoryName: string | null;
  brandName: string | null;
  /** Active Rupiah markup for this product's category, from the Markup menu. */
  markup: number;
}

// The mobile presentation of a product row — large tap target, price as
// the visual anchor (issue M03 section 5, 18: card/list on mobile instead
// of a cramped table). ProductList renders this in a `lg:hidden` column
// and a <table> row in a `hidden lg:table` one, from the same data.
export function ProductCard({ product, categoryName, brandName, markup }: ProductCardProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="truncate font-medium">{product.product_name}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{product.sku}</span>
          {categoryName ? (
            <>
              <span aria-hidden>·</span>
              <span>{categoryName}</span>
            </>
          ) : null}
          {brandName ? (
            <>
              <span aria-hidden>·</span>
              <span>{brandName}</span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {markup > 0 ? (
          <p className="text-xs text-muted-foreground line-through">{formatMoney(product.base_price)}</p>
        ) : null}
        <MoneyDisplay amount={Number(product.base_price) + markup} size="md" />
        <StatusBadge status={product.status} />
      </div>
    </div>
  );
}
