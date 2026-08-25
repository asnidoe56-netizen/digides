import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/formatting/money";

export type PurchaseResultStatus = "SUCCESS" | "FAILED" | "PENDING";

export interface PurchaseResultScreenProps {
  status: PurchaseResultStatus;
  categoryName: string;
  brandName: string;
  /** e.g. "Nomor Tujuan" (telco/e-money/PLN) or "ID Game" (Games). */
  customerIdLabel: string;
  customerId: string;
  nominalLabel: string;
  price: string;
  homeHref: string;
  /** Only set for PENDING — the network/provider message explaining why. */
  note?: string;
}

// The "-foreground" tokens are the darker, saturated variants meant for
// text/icons — the bare status-success/failed/pending tokens are pale
// badge backgrounds (see status-badge.tsx) and would render nearly
// invisible at icon size.
const STATUS_CONFIG: Record<PurchaseResultStatus, { icon: typeof CheckCircle2; color: string; title: string }> = {
  SUCCESS: { icon: CheckCircle2, color: "text-status-success-foreground", title: "Transaksi Berhasil" },
  FAILED: { icon: XCircle, color: "text-status-failed-foreground", title: "Transaksi Gagal" },
  PENDING: { icon: Clock, color: "text-status-pending-foreground", title: "Transaksi Sedang Diproses" },
};

export function PurchaseResultScreen({
  status,
  categoryName,
  brandName,
  customerIdLabel,
  customerId,
  nominalLabel,
  price,
  homeHref,
  note,
}: PurchaseResultScreenProps) {
  const { icon: Icon, color, title } = STATUS_CONFIG[status];

  // "PLN PLN 20.000" reads as a typo when the category and its only
  // brand share the same name (PLN has no separate providers) — collapse
  // to one when they match instead of always concatenating both.
  const productLabel =
    categoryName.toLowerCase() === brandName.toLowerCase() ? categoryName : `${categoryName} ${brandName}`;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <Icon className={`size-16 ${color}`} />
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {status === "SUCCESS"
            ? `${productLabel} ${nominalLabel} untuk ${customerId} telah berhasil dikirim.`
            : status === "PENDING"
              ? (note ?? "Saldo Anda sudah ditahan — transaksi akan diperbarui otomatis begitu provider merespons.")
              : `${categoryName} gagal dikirim. Saldo yang tertahan sudah dikembalikan ke wallet Anda.`}
        </p>
      </div>

      <div className="w-full max-w-xs divide-y rounded-xl border px-4 text-left">
        <div className="flex justify-between py-2 text-sm">
          <span className="text-muted-foreground">Provider</span>
          <span className="font-medium">{brandName}</span>
        </div>
        <div className="flex justify-between py-2 text-sm">
          <span className="text-muted-foreground">{customerIdLabel}</span>
          <span className="font-medium">{customerId}</span>
        </div>
        <div className="flex justify-between py-2 text-sm">
          <span className="text-muted-foreground">Nominal</span>
          <span className="font-medium">{nominalLabel}</span>
        </div>
        <div className="flex justify-between py-2 text-sm">
          <span className="text-muted-foreground">Total Bayar</span>
          <span className="font-semibold">{formatMoney(price)}</span>
        </div>
      </div>

      <Link href={homeHref} className="w-full max-w-xs rounded-full bg-red-600 py-3 text-center font-semibold text-white">
        Kembali ke Beranda
      </Link>
    </div>
  );
}
