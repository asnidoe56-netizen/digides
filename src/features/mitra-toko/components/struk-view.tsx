"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Store as StoreIcon } from "lucide-react";
import { formatMoney } from "@/lib/formatting/money";
import type { StoreOrderDetailResponse } from "../services/toko-api";
import { StoreOrderStatusBadge, StorePaymentStatusBadge } from "./store-status-badge";

export interface StrukViewProps {
  detail: StoreOrderDetailResponse;
  basePath: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// The receipt both sides see. Printing goes through the browser's own
// print dialog with `print:` utilities hiding the app chrome — the same
// approach the Laporan pages already take — rather than generating a
// second, separately-maintained PDF layout on the server.
export function StrukView({ detail, basePath }: StrukViewProps) {
  const { store, order, items, paymentRequests, ledgerEntries, inventoryEvents } = detail;
  const payment = paymentRequests[0];
  const isPaid = order.status === "PAID";

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white print:hidden">
        <Link
          href={`${basePath}/riwayat`}
          aria-label="Kembali"
          className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="flex-1 font-semibold">Struk</h1>
        <button
          type="button"
          onClick={() => window.print()}
          aria-label="Cetak struk"
          className="flex size-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
        >
          <Printer className="size-4" />
        </button>
      </header>

      <div className="flex flex-col gap-4 px-4 py-5">
        <div className="rounded-3xl border bg-card p-5">
          <div className="flex flex-col items-center gap-2 border-b border-dashed pb-4 text-center">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <StoreIcon className="size-5" />
            </span>
            <p className="font-semibold">{store.name}</p>
            <p className="text-xs text-muted-foreground">{dateTimeFormatter.format(new Date(order.created_at))}</p>
            <StoreOrderStatusBadge status={order.status} />
          </div>

          <div className="flex flex-col gap-2 border-b border-dashed py-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × {formatMoney(item.unit_price)}
                  </p>
                </div>
                <p className="shrink-0 font-medium">{formatMoney(item.subtotal)}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold">{formatMoney(order.total_amount)}</span>
          </div>
        </div>

        {/* The audit trail, plainly shown rather than hidden behind a
            support ticket: which ledger rows moved, and what stock did.
            This is the same end-to-end trail §8 of the PRD demands. */}
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-sm">
          <p className="font-semibold">Rincian Transaksi</p>

          <Row label="ID Pesanan" value={<span className="font-mono text-xs">{order.id}</span>} />

          {payment ? (
            <Row label="Status Pembayaran" value={<StorePaymentStatusBadge status={payment.status} />} />
          ) : null}

          {isPaid && ledgerEntries.length > 0 ? (
            <Row
              label="Mutasi Saldo"
              value={
                <span className="text-right">
                  {ledgerEntries.map((entry) => (
                    <span key={entry.id} className="block text-xs">
                      {entry.type === "SALE_IN" ? "Masuk ke toko" : "Dibayar pembeli"} {formatMoney(entry.amount)}
                    </span>
                  ))}
                </span>
              }
            />
          ) : null}

          {inventoryEvents.length > 0 ? (
            <Row
              label="Stok Terpakai"
              value={
                <span className="text-right">
                  {inventoryEvents.map((event) => (
                    <span key={event.id} className="block text-xs">
                      {event.delta} (sisa {event.stock_after})
                    </span>
                  ))}
                </span>
              }
            />
          ) : null}
        </div>

        {!isPaid ? (
          <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            Pesanan ini tidak pernah dibayar, jadi tidak ada saldo yang berpindah dan stok tidak berkurang.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-all text-right">{value}</span>
    </div>
  );
}
