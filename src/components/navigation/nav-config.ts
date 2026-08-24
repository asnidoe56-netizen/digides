import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  Building2,
  ClipboardList,
  Coins,
  FileBarChart2,
  LayoutDashboard,
  Layers,
  Package,
  Percent,
  Scale,
  Settings,
  Share2,
  Tags,
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
    { label: "BUMDes", href: "/dashboard/super-admin/bumdes", icon: Building2 },
    { label: "Pengguna", href: "/dashboard/super-admin/users", icon: Users },
    { label: "Produk", href: "/dashboard/super-admin/products", icon: Package },
    { label: "Kategori", href: "/dashboard/super-admin/categories", icon: Tags },
    { label: "Brand", href: "/dashboard/super-admin/brands", icon: Layers },
    { label: "Markup", href: "/dashboard/super-admin/markup", icon: Percent },
    { label: "Wallet", href: "/dashboard/super-admin/wallets", icon: Wallet },
    { label: "Transaksi", href: "/dashboard/super-admin/transactions", icon: ArrowLeftRight },
    { label: "Referral", href: "/dashboard/super-admin/referrals", icon: Share2 },
    { label: "Komisi", href: "/dashboard/super-admin/commissions", icon: Coins },
    { label: "Laporan", href: "/dashboard/super-admin/reports", icon: FileBarChart2 },
    { label: "Rekonsiliasi", href: "/dashboard/super-admin/reconciliation", icon: Scale },
    { label: "Audit Log", href: "/dashboard/super-admin/audit-logs", icon: ClipboardList },
    { label: "Pengaturan", href: "/dashboard/super-admin/settings", icon: Settings },
  ],
  // Populated when their dashboards are built (M03.5 continues per role).
  BUMDES_ADMIN: [],
  KONTER: [],
  AFFILIATE: [],
};

// The 4 items that fit a thumb-reachable mobile bottom bar (issue M03
// section 5). Everything else in NAV_ITEMS is still reachable through the
// "Lainnya" sheet in MobileBottomNav — nothing is mobile-only-hidden.
export const MOBILE_PRIMARY_NAV_ITEMS: Record<RoleCode, NavItem[]> = {
  SUPER_ADMIN: [
    NAV_ITEMS.SUPER_ADMIN[0], // Dashboard
    NAV_ITEMS.SUPER_ADMIN[3], // Produk
    NAV_ITEMS.SUPER_ADMIN[8], // Transaksi
    NAV_ITEMS.SUPER_ADMIN[7], // Wallet
  ],
  BUMDES_ADMIN: [],
  KONTER: [],
  AFFILIATE: [],
};
