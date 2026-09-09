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
// Where a role's Ganti Password screen lives, for the forced change after
// a Super Admin issues a temporary password
// (docs/security/PEMULIHAN_AKSES_AKUN.md §4).
//
// Returns null for SUPER_ADMIN and AFFILIATE, and that is a real gap
// rather than an oversight being papered over: neither has a Ganti
// Password page on the web at all. An AFFILIATE — which is what most
// mitra are — changes their password in the Digides Mitra app, where the
// forced flow does exist. A caller getting null should send the user to
// their normal home rather than to a route that does not exist.
export function changePasswordRouteForRoles(roles: string[] | undefined): string | null {
  if (roles?.includes("BUMDES_ADMIN")) return "/dashboard/bumdes/akun/ganti-password";
  if (roles?.includes("KONTER")) return "/dashboard/konter/akun/ganti-password";
  return null;
}

export function homeRouteForRoles(roles: string[] | undefined): string {
  if (roles?.includes("SUPER_ADMIN")) return "/dashboard/super-admin/dashboard";
  if (roles?.includes("BUMDES_ADMIN")) return "/dashboard/bumdes/dashboard";
  if (roles?.includes("KONTER")) return "/dashboard/konter/dashboard";
  if (roles?.includes("AFFILIATE")) return "/dashboard/affiliate/mitra";
  return "/";
}
