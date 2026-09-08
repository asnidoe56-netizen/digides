"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, Store as StoreIcon, XCircle } from "lucide-react";
import { PurchasePinScreen } from "@/features/mitra-purchase";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/formatting/money";
import type { StoreOrderItem } from "@/types/store-order";
import type { StorePaymentDetailResponse } from "../services/toko-api";
import { confirmStorePayment } from "../services/toko-api";

export interface BayarViewProps {
  detail: StorePaymentDetailResponse;
  homeHref: string;
}

type Phase = "review" | "pin" | "success";

function secondsLeft(expiresAt: string | Date): number {
  const expiry = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return Math.max(0, Math.floor((expiry.getTime() - Date.now()) / 1000));
}

// The buyer's side of a store payment: see exactly what is being charged
// and by whom, then confirm with their own PIN on their own device — the
// merchant's screen never sees any of this (PRD §6 rule 2).
export function BayarView({ detail, homeHref }: BayarViewProps) {
  const { store, order, items, paymentRequest } = detail;
  const [phase, setPhase] = useState<Phase>("review");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Starts as null rather than being computed during render: this screen
  // is server-rendered, and "how many seconds are left" is different on
  // the server than it is a moment later in the browser, which React
  // reports as a hydration mismatch. The real figure is filled in on the
  // client, in the effect below.
  const [remaining, setRemaining] = useState<number | null>(null);

  const alreadySettled = paymentRequest.status !== "MENUNGGU";

  useEffect(() => {
    if (alreadySettled || phase === "success") return;
    setRemaining(secondsLeft(paymentRequest.expires_at));
    const handle = setInterval(() => setRemaining(secondsLeft(paymentRequest.expires_at)), 1000);
    return () => clearInterval(handle);
  }, [alreadySettled, phase, paymentRequest.expires_at]);

  async function handleConfirm(pin: string) {
    setIsSubmitting(true);
    setError(null);
    try {
      await confirmStorePayment(paymentRequest.id, pin);
      setPhase("success");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Pembayaran gagal diproses.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (phase === "success" || paymentRequest.status === "BERHASIL") {
    return (
      <ResultScreen
        tone="success"
        title="Pembayaran Berhasil"
        amount={order.total_amount}
        caption={`Dibayarkan ke ${store.name}`}
        items={items}
        homeHref={homeHref}
      />
    );
  }

  if (alreadySettled) {
    return (
      <ResultScreen
        tone="failed"
        title={paymentRequest.status === "KEDALUWARSA" ? "QR Kedaluwarsa" : "Pembayaran Tidak Tersedia"}
        amount={order.total_amount}
        caption="Minta kasir membuat QR baru — tidak ada saldo Anda yang terpotong."
        items={items}
        homeHref={homeHref}
      />
    );
  }

  if (phase === "pin") {
    return (
      <PurchasePinScreen
        onBack={() => setPhase("review")}
        onSubmit={handleConfirm}
        isSubmitting={isSubmitting}
        error={error}
      />
    );
  }

  const countdown =
    remaining === null
      ? "--:--"
      : `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  // Only an actually-measured zero counts as expired — `null` just means
  // the client hasn't measured yet, and must never disable the button.
  const isExpired = remaining === 0;

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
        <Link
          href={homeHref}
          aria-label="Kembali"
          className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="font-semibold">Konfirmasi Pembayaran</h1>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4 py-5">
        <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <StoreIcon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Bayar ke</p>
            <p className="truncate font-semibold">{store.name}</p>
          </div>
        </div>

        <div className="rounded-3xl bg-linear-to-br from-red-500 to-red-700 p-5 text-center text-white">
          <p className="text-xs text-white/80">Total Tagihan</p>
          <p className="mt-1 text-3xl font-bold">{formatMoney(order.total_amount)}</p>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
          <p className="text-sm font-semibold">Rincian</p>
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

        <div
          className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
            isExpired
              ? "bg-status-failed text-status-failed-foreground"
              : "bg-status-pending text-status-pending-foreground"
          }`}
        >
          <Clock3 className="size-4" />
          {isExpired ? "Waktu habis" : `Selesaikan dalam ${countdown}`}
        </div>

        {error ? (
          <p className="rounded-xl bg-status-failed px-3 py-2.5 text-sm text-status-failed-foreground">{error}</p>
        ) : null}

        <div className="mt-auto">
          <button
            type="button"
            onClick={() => setPhase("pin")}
            disabled={isExpired}
            className="w-full rounded-2xl bg-red-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 disabled:opacity-50 disabled:shadow-none"
          >
            Bayar Sekarang
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            PIN Anda dimasukkan di perangkat Anda sendiri dan tidak pernah dilihat kasir.
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultScreen({
  tone,
  title,
  amount,
  caption,
  items,
  homeHref,
}: {
  tone: "success" | "failed";
  title: string;
  amount: string;
  caption: string;
  items: StoreOrderItem[];
  homeHref: string;
}) {
  const isSuccess = tone === "success";

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
        <h1 className="font-semibold">{title}</h1>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <div
          className={`flex size-20 items-center justify-center rounded-full ${
            isSuccess
              ? "bg-status-success text-status-success-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isSuccess ? <CheckCircle2 className="size-10" /> : <XCircle className="size-10" />}
        </div>

        <div>
          <p className="text-3xl font-bold">{formatMoney(amount)}</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">{caption}</p>
        </div>

        <div className="w-full max-w-sm rounded-2xl border bg-card p-4 text-left">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 py-1 text-sm">
              <span className="min-w-0 truncate">
                {item.product_name} <span className="text-muted-foreground">×{item.quantity}</span>
              </span>
              <span className="shrink-0 font-medium">{formatMoney(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <Link
          href={homeHref}
          className="w-full max-w-sm rounded-2xl bg-red-600 px-4 py-3.5 font-semibold text-white hover:bg-red-700"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
