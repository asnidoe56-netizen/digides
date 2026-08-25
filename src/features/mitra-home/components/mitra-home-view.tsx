import { ChevronRight } from "lucide-react";
import type { Category } from "@/types/product";
import { CategoryGrid } from "./category-grid";
import { MitraBottomNav } from "./mitra-bottom-nav";
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
  /** This page's own path — the bottom nav's "Beranda" active state and
   *  the tab it renders lives here, not in the shared role layout, since
   *  drill-down flows like Pulsa are full-screen with no bottom nav. */
  homeHref: string;
}

export function MitraHomeView({
  fullName,
  roleLabel,
  availableBalance,
  heldBalance,
  categories,
  categoryHrefs,
  homeHref,
}: MitraHomeViewProps) {
  return (
    <div className="flex flex-col gap-6 pb-20">
      <WalletSummaryCard
        fullName={fullName}
        roleLabel={roleLabel}
        availableBalance={availableBalance}
        heldBalance={heldBalance}
      />

      <div className="flex flex-col gap-6 px-4">
        <QuickActions />

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

      <MitraBottomNav homeHref={homeHref} />
    </div>
  );
}
