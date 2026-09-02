// Maps a catalog brand's name (as stored in `brands.name`) to its logo in
// public/logos/brands/ — only the Pulsa telco brands and E-Money wallets
// have one so far. Anything not listed here falls back to the initials
// badge the provider grid already draws (category-purchase-flow.tsx), so
// adding a brand to the catalog without a logo here never breaks the page.
const BRAND_LOGOS: Record<string, string> = {
  AXIS: "/logos/brands/axis.svg",
  "by.U": "/logos/brands/byu.svg",
  INDOSAT: "/logos/brands/indosat.svg",
  SMARTFREN: "/logos/brands/smartfren.svg",
  TELKOMSEL: "/logos/brands/telkomsel.svg",
  TRI: "/logos/brands/tri.svg",
  XL: "/logos/brands/xl.svg",
  DANA: "/logos/brands/dana.svg",
  "GO PAY": "/logos/brands/gopay.svg",
  LinkAja: "/logos/brands/linkaja.svg",
  OVO: "/logos/brands/ovo.svg",
  "SHOPEE PAY": "/logos/brands/shopeepay.svg",
};

export function getBrandLogo(brandName: string): string | null {
  return BRAND_LOGOS[brandName] ?? null;
}
