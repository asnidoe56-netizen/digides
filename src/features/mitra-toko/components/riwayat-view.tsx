"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, ReceiptText } from "lucide-react";
import { formatMoney } from "@/lib/formatting/money";
import { cn } from "@/lib/utils";
import type { StoreOrder, StoreOrderStatus } from "@/types/store-order";
import type { StoreSalesReport } from "@/services/store-report.service";
import { LabaHarianCard } from "./laba-harian-card";
import { StoreOrderStatusBadge } from "./store-status-badge";

const FILTERS: Array<{ label: string; value: StoreOrderStatus | "ALL" }> = [
  { label: "Semua", value: "ALL" },
  { label: "Lunas", value: "PAID" },
  { label: "Menunggu", value: "PENDING" },
  { label: "Kedaluwarsa", value: "EXPIRED" },
];

export interface RiwayatViewProps {
  orders: StoreOrder[];
  /** Today's sales and profit per category — PRD Kasir Pintar Tahap 4. */
  report: StoreSalesReport;
  basePath: string;
}

// Filtering happens client-side over the page already fetched, not by
// re-querying per tab — a warung's recent history is small, and an
// instant tab switch matters more here than exactness across pages.
export function RiwayatView({ orders, report, basePath }: RiwayatViewProps) {
  const [filter, setFilter] = useState<StoreOrderStatus | "ALL">("ALL");
  const visible = filter === "ALL" ? orders : orders.filter((order) => order.status === filter);

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-20 flex flex-col bg-background">
        <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
          <Link
            href={basePath}
            aria-label="Kembali"
            className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-semibold">Riwayat Toko</h1>
        </header>

        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium",
                filter === option.value
                  ? "border-red-600 bg-red-600 text-white"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-6">
        {/* Replaces the old "total penjualan lunas (halaman ini)" card.
            That figure was scoped to whatever happened to be on this page
            — an implementation detail leaking into the UI, and a number
            that quietly changed meaning as the history grew. "Hari ini"
            is a figure a shopkeeper can actually check against their own
            cash box. */}
        <LabaHarianCard report={report} />

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <ReceiptText className="size-6" />
            </span>
            <p className="text-sm text-muted-foreground">
              {orders.length === 0 ? "Belum ada transaksi di toko Anda." : "Tidak ada transaksi pada filter ini."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((order) => (
              <Link
                key={order.id}
                href={`${basePath}/riwayat/${order.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3 hover:bg-accent"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{formatMoney(order.total_amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StoreOrderStatusBadge status={order.status} />
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
