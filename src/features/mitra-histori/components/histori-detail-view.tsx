"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Copy } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { formatMoney } from "@/lib/formatting/money";
import { parsePlnToken } from "@/lib/formatting/pln-token";
import type { TransactionWithDetail } from "@/repositories/transaction.repository";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function CopyTokenButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the token is already selectable text.
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

export interface HistoriDetailViewProps {
  historiHref: string;
  transaction: TransactionWithDetail;
}

// PLN's provider_transaction_id is the "sn" Digiflazz's webhook wrote
// straight into PostgreSQL (transaction.service.ts's captureTransaction)
// — read verbatim here, never re-fetched from Digiflazz and never altered
// in storage; parsePlnToken() only splits it apart for display so the
// copyable token shows as just the number.
export function HistoriDetailView({ historiHref, transaction }: HistoriDetailViewProps) {
  const isPln = transaction.category_name === "PLN";
  const showToken = isPln && transaction.status === "SUCCESS" && transaction.provider_transaction_id;
  const parsedToken = showToken ? parsePlnToken(transaction.provider_transaction_id!) : null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
        <Link
          href={historiHref}
          aria-label="Kembali"
          className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-semibold">Detail Transaksi</h1>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{transaction.product_name}</p>
            <p className="text-xs text-muted-foreground">{transaction.category_name ?? "Lainnya"}</p>
          </div>
          <StatusBadge status={transaction.status} />
        </div>

        <div className="divide-y rounded-xl border px-4">
          <div className="flex justify-between py-3 text-sm">
            <span className="text-muted-foreground">ID Pelanggan / Nomor Tujuan</span>
            <span className="font-medium">{transaction.customer_number}</span>
          </div>
          {parsedToken?.customerName ? (
            <div className="flex justify-between py-3 text-sm">
              <span className="text-muted-foreground">Nama Pelanggan</span>
              <span className="font-medium">{parsedToken.customerName}</span>
            </div>
          ) : null}
          {parsedToken?.tariff && parsedToken?.power ? (
            <div className="flex justify-between py-3 text-sm">
              <span className="text-muted-foreground">Tarif/Daya</span>
              <span className="font-medium">
                {parsedToken.tariff}/{parsedToken.power}
              </span>
            </div>
          ) : null}
          {parsedToken?.kwh ? (
            <div className="flex justify-between py-3 text-sm">
              <span className="text-muted-foreground">Kwh Didapat</span>
              <span className="font-medium">{parsedToken.kwh}</span>
            </div>
          ) : null}
          <div className="flex justify-between py-3 text-sm">
            <span className="text-muted-foreground">Harga</span>
            <span className="font-semibold">{formatMoney(transaction.selling_price)}</span>
          </div>
          <div className="flex justify-between py-3 text-sm">
            <span className="text-muted-foreground">Waktu</span>
            <span className="font-medium">{dateFormatter.format(new Date(transaction.created_at))}</span>
          </div>
        </div>

        {showToken ? (
          <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold text-red-700">Token PLN</p>
            <p className="text-sm font-semibold break-all select-all">{parsedToken?.token}</p>
            <CopyTokenButton value={parsedToken!.token} />
          </div>
        ) : null}

        {transaction.status === "PENDING" || transaction.status === "RESERVED" ? (
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            Transaksi masih diproses provider — halaman ini akan menampilkan hasil akhirnya begitu status berubah.
          </p>
        ) : null}
      </div>
    </div>
  );
}
