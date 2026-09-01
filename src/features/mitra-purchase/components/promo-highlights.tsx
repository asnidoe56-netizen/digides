import { BadgeDollarSign, ChevronRight, Crown, Gift, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { MERCHANDISING_BANNER_COPY, MERCHANDISING_FOOTER_COPY, type MerchandisingFilter } from "../lib/merchandising-config";

export interface PromoBannerProps {
  filter: MerchandisingFilter;
  /** The provider currently featured for this tab (see category-purchase-
   *  flow.tsx's `featuredBrand`) — null when no product has this tag yet. */
  brandName: string | null;
}

// The red hero card atop the provider-browse screen. Content is driven by
// the active MerchandisingTabs selection, not hardcoded per category, so
// the same component works for Pulsa, E-Money, Games, etc.
export function PromoBanner({ filter, brandName }: PromoBannerProps) {
  const copy = MERCHANDISING_BANNER_COPY[filter];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-red-500 via-red-600 to-red-700 p-4 text-white">
      <Sparkles className="absolute top-3 right-4 size-5 text-yellow-200/80" aria-hidden />
      <Gift className="absolute right-6 bottom-3 size-14 text-white/10" aria-hidden />
      <p className="text-[11px] font-medium tracking-wide text-yellow-200">• KATALOG SPESIAL</p>
      <p className="mt-1 text-xl leading-tight font-extrabold">
        {brandName ? <span className="block uppercase">{brandName}</span> : null}
        <span className="text-yellow-300">{copy.title}</span>
      </p>
      <p className="mt-1 max-w-[75%] text-xs text-white/90">{copy.subtitle}</p>
      <span className="mt-2 inline-block rounded-full bg-yellow-400 px-3 py-1 text-[11px] font-semibold text-red-700">
        {copy.pill}
      </span>
      <div className="mt-3 flex items-center justify-center gap-1">
        <span className="h-1.5 w-4 rounded-full bg-white" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
      </div>
    </div>
  );
}

const FEATURE_BADGES = [
  { icon: BadgeDollarSign, label: "Harga Terbaik", subtitle: "Dijamin termurah", className: "bg-blue-50 text-blue-600" },
  { icon: Zap, label: "Transaksi Cepat", subtitle: "Proses hanya 2 detik", className: "bg-blue-50 text-blue-600" },
  { icon: ShieldCheck, label: "Aman 100%", subtitle: "Terproteksi sistem", className: "bg-emerald-50 text-emerald-600" },
];

export function FeatureBadges() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {FEATURE_BADGES.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex flex-col items-center gap-1 rounded-xl border p-3 text-center">
            <span className={cn("flex size-7 items-center justify-center rounded-full", item.className)}>
              <Icon className="size-4" />
            </span>
            <p className="text-[11px] leading-tight font-semibold">{item.label}</p>
            <p className="text-[10px] leading-tight text-muted-foreground">{item.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}

export interface PromoFooterCardProps {
  filter: MerchandisingFilter;
  categoryName: string;
  brandName: string | null;
}

export function PromoFooterCard({ filter, categoryName, brandName }: PromoFooterCardProps) {
  const copy = MERCHANDISING_FOOTER_COPY[filter];
  return (
    <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
        <Crown className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-red-600">{copy.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {categoryName}
          {brandName ? ` ${brandName}` : ""} {copy.subtitle}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-red-400" aria-hidden />
    </div>
  );
}
