// Where each role's "home" is. Extracted from LoginForm (which is still
// its main caller) once a second place needed the same answer: the store
// payment page at /bayar/[id], which is deliberately not inside any role's
// dashboard — a buyer paying at a warung is any Digides user at all, most
// often a plain AFFILIATE — and so has to work out where "Kembali ke
// Beranda" should point for whoever happens to be signed in.
//
// AFFILIATE's only page today is Menu Mitra (their referral code,
// downline, and reward status); there's no Beranda/Laporan/Akun shell for
// them yet, hence the different shape of that one entry.
export function homeRouteForRoles(roles: string[] | undefined): string {
  if (roles?.includes("SUPER_ADMIN")) return "/dashboard/super-admin/dashboard";
  if (roles?.includes("BUMDES_ADMIN")) return "/dashboard/bumdes/dashboard";
  if (roles?.includes("KONTER")) return "/dashboard/konter/dashboard";
  if (roles?.includes("AFFILIATE")) return "/dashboard/affiliate/mitra";
  return "/";
}
