import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  ClipboardList,
  BadgePercent,
  Coins,
  FileBarChart2,
  Handshake,
  Hourglass,
  LayoutDashboard,
  Layers,
  LifeBuoy,
  Package,
  Percent,
  Scale,
  Settings,
  Share2,
  DatabaseBackup,
  Shield,
  Store,
  Tags,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { RoleCode } from "@/types/user";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// One list per role — hiding a menu item is a UX convenience only, never
// the authorization boundary (issue M03 section 22: "Hiding menu ≠
// authorization"). The Route Handler behind every link still has to check
// the caller's role itself once sessions exist.
export const NAV_ITEMS: Record<RoleCode, NavItem[]> = {
  SUPER_ADMIN: [
    { label: "Dashboard", href: "/dashboard/super-admin/dashboard", icon: LayoutDashboard },
    { label: "Mitra", href: "/dashboard/super-admin/mitra", icon: Handshake },
    { label: "Toko", href: "/dashboard/super-admin/toko", icon: Store },
    { label: "Pengguna", href: "/dashboard/super-admin/users", icon: Users },
    { label: "Produk", href: "/dashboard/super-admin/products", icon: Package },
    { label: "Kategori", href: "/dashboard/super-admin/categories", icon: Tags },
    { label: "Brand", href: "/dashboard/super-admin/brands", icon: Layers },
    { label: "Markup", href: "/dashboard/super-admin/markup", icon: Percent },
    { label: "Wallet", href: "/dashboard/super-admin/wallets", icon: Wallet },
    { label: "Transaksi", href: "/dashboard/super-admin/transactions", icon: ArrowLeftRight },
    { label: "Transaksi Tertahan", href: "/dashboard/super-admin/transaksi-tertahan", icon: Hourglass },
    { label: "Referral", href: "/dashboard/super-admin/referrals", icon: Share2 },
    { label: "Komisi", href: "/dashboard/super-admin/commissions", icon: Coins },
    { label: "Cashback", href: "/dashboard/super-admin/cashback", icon: BadgePercent },
    { label: "Laporan", href: "/dashboard/super-admin/reports", icon: FileBarChart2 },
    { label: "Keuntungan", href: "/dashboard/super-admin/keuntungan", icon: TrendingUp },
    { label: "Rekonsiliasi", href: "/dashboard/super-admin/reconciliation", icon: Scale },
    { label: "Audit Log", href: "/dashboard/super-admin/audit-logs", icon: ClipboardList },
    { label: "Tim Support", href: "/dashboard/super-admin/support", icon: LifeBuoy },
    { label: "Keamanan", href: "/dashboard/super-admin/security", icon: Shield },
    { label: "Cadangan Data", href: "/dashboard/super-admin/backup", icon: DatabaseBackup },
    { label: "Pengaturan", href: "/dashboard/super-admin/settings", icon: Settings },
  ],
  // Populated when their dashboards are built (M03.5 continues per role).
  BUMDES_ADMIN: [],
  KONTER: [],
  AFFILIATE: [],
};

// Picks an item out of a role's list by its route rather than by position.
// These used to be array indices, which silently pointed at the wrong menu
// the moment an item was inserted above them (adding "Toko" after "Mitra"
// shifted every one of them). Looking up by href can't drift, and throws
// loudly at module load if a route is ever renamed without updating here.
function navItemByHref(role: RoleCode, href: string): NavItem {
  const item = NAV_ITEMS[role].find((candidate) => candidate.href === href);
  if (!item) {
    throw new Error(`MOBILE_PRIMARY_NAV_ITEMS: no ${role} nav item for ${href}`);
  }
  return item;
}

// The 4 items that fit a thumb-reachable mobile bottom bar (issue M03
// section 5). Everything else in NAV_ITEMS is still reachable through the
// "Lainnya" sheet in MobileBottomNav — nothing is mobile-only-hidden.
export const MOBILE_PRIMARY_NAV_ITEMS: Record<RoleCode, NavItem[]> = {
  SUPER_ADMIN: [
    navItemByHref("SUPER_ADMIN", "/dashboard/super-admin/dashboard"),
    navItemByHref("SUPER_ADMIN", "/dashboard/super-admin/products"),
    navItemByHref("SUPER_ADMIN", "/dashboard/super-admin/transactions"),
    navItemByHref("SUPER_ADMIN", "/dashboard/super-admin/wallets"),
  ],
  BUMDES_ADMIN: [],
  KONTER: [],
  AFFILIATE: [],
};
