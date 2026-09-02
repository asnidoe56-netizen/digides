"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Clock, Copy, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/formatting/money";
import { parsePlnToken } from "@/lib/formatting/pln-token";

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
  /** Where "Lihat di Histori" points while still PENDING/timed out —
   *  category-purchase-flow.tsx derives this from homeHref. */
  historiHref?: string;
  /** Only set for PENDING — the network/provider message explaining why. */
  note?: string;
  /** SUCCESS only — transactions.provider_transaction_id straight from
   *  PostgreSQL (the webhook capture already wrote it; never re-fetched
   *  from Digiflazz here, never altered in storage). For PLN this is the
   *  full "token/nama/tarif/daya/kwh" string Digiflazz returns in `sn` —
   *  split for display by parsePlnToken() so the copyable token shows as
   *  just the number, with name/tariff/power/kwh broken out as their own
   *  rows above it. */
  providerTransactionId?: string | null;
  /** Bagian 8: the bounded poll (category-purchase-flow.tsx) ran out of
   *  attempts while still PENDING — still not a failure, just tells the
   *  mitra to check Histori instead of continuing to wait on this screen. */
  timedOut?: boolean;
}

function CopyTokenButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the token is
      // already shown as selectable text, so this is a soft failure.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center justify-center gap-1.5 rounded-full border border-red-600 px-4 py-2 text-xs font-semibold text-red-600"
    >
      <Copy className="size-3.5" />
      {copied ? "Tersalin!" : "Salin Token"}
    </button>
  );
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
  historiHref,
  note,
  providerTransactionId,
  timedOut,
}: PurchaseResultScreenProps) {
  const { icon: Icon, color, title } = STATUS_CONFIG[status];

  // "PLN PLN 20.000" reads as a typo when the category and its only
  // brand share the same name (PLN has no separate providers) — collapse
  // to one when they match instead of always concatenating both.
  const productLabel =
    categoryName.toLowerCase() === brandName.toLowerCase() ? categoryName : `${categoryName} ${brandName}`;

  const isPln = categoryName === "PLN";
  const parsedToken =
    status === "SUCCESS" && providerTransactionId && isPln ? parsePlnToken(providerTransactionId) : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <Icon className={`size-16 ${color}`} />
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {status === "SUCCESS"
            ? `${productLabel} ${nominalLabel} untuk ${customerId} telah berhasil dikirim.`
            : status === "PENDING"
              ? timedOut
                ? "Transaksi masih diproses provider. Saldo Anda sudah ditahan — cek Histori beberapa saat lagi untuk hasil akhirnya."
                : (note ?? "Saldo Anda sudah ditahan — transaksi akan diperbarui otomatis begitu provider merespons.")
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
        {parsedToken?.customerName ? (
          <div className="flex justify-between py-2 text-sm">
            <span className="text-muted-foreground">Nama Pelanggan</span>
            <span className="font-medium">{parsedToken.customerName}</span>
          </div>
        ) : null}
        {parsedToken?.tariff && parsedToken?.power ? (
          <div className="flex justify-between py-2 text-sm">
            <span className="text-muted-foreground">Tarif/Daya</span>
            <span className="font-medium">
              {parsedToken.tariff}/{parsedToken.power}
            </span>
          </div>
        ) : null}
        {parsedToken?.kwh ? (
          <div className="flex justify-between py-2 text-sm">
            <span className="text-muted-foreground">Kwh Didapat</span>
            <span className="font-medium">{parsedToken.kwh}</span>
          </div>
        ) : null}
        <div className="flex justify-between py-2 text-sm">
          <span className="text-muted-foreground">Nominal</span>
          <span className="font-medium">{nominalLabel}</span>
        </div>
        <div className="flex justify-between py-2 text-sm">
          <span className="text-muted-foreground">Total Bayar</span>
          <span className="font-semibold">{formatMoney(price)}</span>
        </div>
      </div>

      {status === "SUCCESS" && providerTransactionId && isPln ? (
        <div className="flex w-full max-w-xs flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-left">
          <p className="text-xs font-semibold text-red-700">Token PLN</p>
          <p className="text-sm font-semibold break-all select-all">{parsedToken?.token ?? providerTransactionId}</p>
          <CopyTokenButton value={parsedToken?.token ?? providerTransactionId} />
        </div>
      ) : null}

      <Link href={homeHref} className="w-full max-w-xs rounded-full bg-red-600 py-3 text-center font-semibold text-white">
        Kembali ke Beranda
      </Link>
      {status === "PENDING" && historiHref ? (
        <Link href={historiHref} className="text-sm font-semibold text-red-600 underline">
          Lihat di Histori
        </Link>
      ) : null}
    </div>
  );
}
