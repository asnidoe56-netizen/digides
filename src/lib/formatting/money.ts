const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Formats a Rupiah amount the one way it should ever be shown in this app:
 * `Rp100.000` — no space after "Rp", period as the thousands separator, no
 * decimals (IDR has no practical subunit). See issue M03 section 17.
 *
 * Accepts a string because PostgreSQL NUMERIC columns come back from `pg`
 * as strings (src/types/wallet.ts, transaction.ts, etc. all type money
 * fields as `string` to avoid float precision loss).
 */
export function formatMoney(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;

  if (!Number.isFinite(value)) {
    return "Rp0";
  }

  // Intl inserts a (non-breaking) space between "Rp" and the digits —
  // strip it to match the exact "Rp100.000" format the app requires.
  return idrFormatter.format(value).replace(/\s/g, "");
}
