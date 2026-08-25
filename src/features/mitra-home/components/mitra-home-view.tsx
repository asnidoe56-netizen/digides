import { ChevronRight } from "lucide-react";
import type { Category } from "@/types/product";
import { CategoryGrid } from "./category-grid";
import { PromoBanner } from "./promo-banner";
import { QuickActions } from "./quick-actions";
import { WalletSummaryCard } from "./wallet-summary-card";

export interface MitraHomeViewProps {
  fullName: string;
  roleLabel: string;
  availableBalance: string;
  heldBalance: string;
  categories: Category[];
  /** Category name -> its real purchase-flow route (e.g. "Pulsa" -> the
   *  role's /pulsa page). Everything else stays disabled. */
  categoryHrefs?: Record<string, string>;
  /** Quick-action label -> its real route (e.g. "Histori" -> the role's
   *  /histori page). Everything else stays disabled. */
  actionHrefs?: Record<string, string>;
}

export function MitraHomeView({
  fullName,
  roleLabel,
  availableBalance,
  heldBalance,
  categories,
  categoryHrefs,
  actionHrefs,
}: MitraHomeViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <WalletSummaryCard
        fullName={fullName}
        roleLabel={roleLabel}
        availableBalance={availableBalance}
        heldBalance={heldBalance}
      />

      <div className="flex flex-col gap-6 px-4">
        <QuickActions actionHrefs={actionHrefs} />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Layanan Favorit</h2>
            <button type="button" disabled title="Segera hadir" className="flex items-center text-sm font-medium text-red-600/60">
              Lihat Semua
              <ChevronRight className="size-4" />
            </button>
          </div>
          <CategoryGrid categories={categories} hrefByCategoryName={categoryHrefs} />
        </div>

        <PromoBanner />
      </div>
    </div>
  );
}
