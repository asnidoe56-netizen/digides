import { BadgePercent, Flame, ShoppingBag, ThumbsUp, type LucideIcon } from "lucide-react";
import type { MerchandisingTag } from "@/types/product";

// "REGULER" is the browse-tab sentinel for "no merchandising_tag filter" —
// distinct from `null` on the Product row itself, since a tab always needs
// a concrete, selectable value.
export type MerchandisingFilter = MerchandisingTag | "REGULER";

interface MerchandisingTabConfig {
  value: MerchandisingFilter;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  iconClassName: string;
  activeClassName: string;
  activeTextClassName: string;
}

export const MERCHANDISING_TABS: MerchandisingTabConfig[] = [
  {
    value: "SUPER_MURAH",
    label: "Super Murah",
    subtitle: "Hemat Maksimal",
    icon: Flame,
    iconClassName: "bg-red-100 text-red-600",
    activeClassName: "border-red-500 bg-red-50",
    activeTextClassName: "text-red-600",
  },
  {
    value: "PROMO",
    label: "Promo",
    subtitle: "Diskon Spesial",
    icon: BadgePercent,
    iconClassName: "bg-blue-100 text-blue-600",
    activeClassName: "border-blue-500 bg-blue-50",
    activeTextClassName: "text-blue-600",
  },
  {
    value: "TERLARIS",
    label: "Terlaris",
    subtitle: "Paling Banyak",
    icon: ThumbsUp,
    iconClassName: "bg-sky-100 text-sky-600",
    activeClassName: "border-sky-500 bg-sky-50",
    activeTextClassName: "text-sky-600",
  },
  {
    value: "REGULER",
    label: "Reguler",
    subtitle: "Semua Produk",
    icon: ShoppingBag,
    iconClassName: "bg-rose-100 text-rose-500",
    activeClassName: "border-rose-400 bg-rose-50",
    activeTextClassName: "text-rose-500",
  },
];

export const MERCHANDISING_BANNER_COPY: Record<
  MerchandisingFilter,
  { title: string; subtitle: string; pill: string }
> = {
  SUPER_MURAH: {
    title: "SUPER MURAH",
    subtitle: "Pilihan terbaik dengan harga paling hemat",
    pill: "Hemat sampai Rp1.000",
  },
  PROMO: {
    title: "PROMO",
    subtitle: "Diskon spesial pilihan hari ini",
    pill: "Diskon Terbatas",
  },
  TERLARIS: {
    title: "TERLARIS",
    subtitle: "Produk paling banyak dibeli agen",
    pill: "Favorit Agen",
  },
  REGULER: {
    title: "REGULER",
    subtitle: "Semua produk tersedia untuk dibeli",
    pill: "Semua Nominal",
  },
};

export const MERCHANDISING_LABELS: Record<MerchandisingFilter, string> = Object.fromEntries(
  MERCHANDISING_TABS.map((tab) => [tab.value, tab.label]),
) as Record<MerchandisingFilter, string>;

export const MERCHANDISING_FOOTER_COPY: Record<MerchandisingFilter, { title: string; subtitle: string }> = {
  SUPER_MURAH: {
    title: "Pilih Super Murah, Untung Berlipat!",
    subtitle: "favorit agen dengan harga paling hemat.",
  },
  PROMO: {
    title: "Jangan Lewatkan Promo Hari Ini!",
    subtitle: "diskon spesial hanya untuk waktu terbatas.",
  },
  TERLARIS: {
    title: "Produk Terlaris Pilihan Agen!",
    subtitle: "paling banyak dibeli, paling dipercaya.",
  },
  REGULER: {
    title: "Semua Produk Tersedia di Sini",
    subtitle: "lengkap untuk semua kebutuhan pelanggan.",
  },
};
