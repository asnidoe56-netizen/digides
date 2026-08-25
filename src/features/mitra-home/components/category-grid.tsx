import Link from "next/link";
import {
  Clock,
  Flame,
  Gamepad2,
  Grid3x3,
  Phone,
  Smartphone,
  Ticket,
  Tv,
  Wallet2,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/types/product";

// Maps a real category name (from the Digiflazz-synced catalog, see
// categories table) to a representative icon — matched by keyword since
// there's no icon column on categories, only a small curated dictionary
// with a sensible fallback for anything not listed.
const ICON_BY_KEYWORD: Array<{ keyword: string; icon: LucideIcon }> = [
  { keyword: "pulsa", icon: Smartphone },
  { keyword: "data", icon: Wifi },
  { keyword: "pln", icon: Zap },
  { keyword: "gas", icon: Flame },
  { keyword: "e-money", icon: Wallet2 },
  { keyword: "game", icon: Gamepad2 },
  { keyword: "tv", icon: Tv },
  { keyword: "voucher", icon: Ticket },
  { keyword: "masa aktif", icon: Clock },
  { keyword: "sms", icon: Phone },
  { keyword: "telpon", icon: Phone },
];

function iconForCategory(name: string): LucideIcon {
  const lower = name.toLowerCase();
  return ICON_BY_KEYWORD.find((entry) => lower.includes(entry.keyword))?.icon ?? Grid3x3;
}

export interface CategoryGridProps {
  categories: Category[];
  /** Category name -> its real purchase-flow route. Everything else in
   *  the grid stays disabled until its own screen is built. */
  hrefByCategoryName?: Record<string, string>;
}

export function CategoryGrid({ categories, hrefByCategoryName = {} }: CategoryGridProps) {
  const active = categories.filter((category) => category.status === "ACTIVE");

  return (
    <div className="grid grid-cols-4 gap-y-4">
      {active.map((category) => {
        const Icon = iconForCategory(category.name);
        const href = hrefByCategoryName[category.name];

        const content = (
          <>
            <span className="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Icon className="size-5" />
            </span>
            <span className="line-clamp-1 text-xs font-medium">{category.name}</span>
          </>
        );

        if (href) {
          return (
            <Link key={category.id} href={href} className="flex flex-col items-center gap-2 text-center">
              {content}
            </Link>
          );
        }

        return (
          <button
            key={category.id}
            type="button"
            disabled
            title="Segera hadir"
            className="flex flex-col items-center gap-2 text-center text-muted-foreground/60"
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
