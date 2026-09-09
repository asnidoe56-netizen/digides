// PRD Kasir Pintar §6.7 — the arithmetic behind "Untung Rp2.000 · 20%".
//
// Kept in one place because Flutter mirrors it exactly (Tahap 2 builds the
// same form on both platforms) and because getting the rounding subtly
// different between web and app would show up as two different suggested
// prices for the same product, which reads as a bug in the money.
//
// §6.6 boundary, restated where the maths lives: this is the SHOPKEEPER'S
// margin, a bookkeeping figure describing their own buying and selling. It
// is not Digides' markup, it never reaches markup_rules, and nothing in
// the PPOB pricing engine may call anything in this file.

export interface MarginResult {
  /** Rupiah kept per unit sold — can be negative if selling below cost. */
  profit: number;
  /** Profit as a percentage OF COST (modal), matching how a shopkeeper
   *  says it: "beli 10 ribu, jual 12 ribu, untung 20%". Null when modal is
   *  zero, because a percentage of nothing has no meaning — the rupiah
   *  figure still does. */
  percent: number | null;
}

// Returns null when there is nothing honest to show: no modal filled in.
// The caller must render that as "modal belum diisi", never as Rp0 profit
// (§10) — a fabricated zero would quietly understate the warung's takings.
export function computeMargin(price: number | null, cost: number | null): MarginResult | null {
  if (cost === null || price === null) return null;
  if (!Number.isFinite(price) || !Number.isFinite(cost)) return null;

  const profit = price - cost;
  return {
    profit,
    percent: cost > 0 ? (profit / cost) * 100 : null,
  };
}

/** Harga warung selalu bulat. §6.7: bulatkan ke kelipatan Rp500 ke atas. */
export const PRICE_ROUNDING_STEP = 500;

// The "isi margin %" helper: type 20, get a selling price back.
//
// Rounded UP to the next Rp500 rather than to the nearest, so the helper
// never suggests a price that earns LESS than the margin the owner asked
// for — being handed 19.8% when you typed 20% is the kind of small wrong
// that erodes trust in the number. The result is a suggestion and stays
// fully editable, which is the whole point of §6.7: rupiah is the source
// of truth, percent is only a convenience.
export function priceFromMarginPercent(cost: number, percent: number): number | null {
  if (!Number.isFinite(cost) || !Number.isFinite(percent)) return null;
  if (cost <= 0) return null;

  const raw = cost * (1 + percent / 100);
  return Math.ceil(raw / PRICE_ROUNDING_STEP) * PRICE_ROUNDING_STEP;
}

/** "20,5%" — one decimal, and only when it earns its place. */
export function formatMarginPercent(percent: number): string {
  const rounded = Math.round(percent * 10) / 10;
  return `${rounded.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
}
