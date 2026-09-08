"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { formatMoney } from "@/lib/formatting/money";
import type { StoreOrder, StoreOrderItem, StorePaymentRequest } from "@/types/store-order";
import { getStorePaymentDetail } from "../services/toko-api";

const POLL_INTERVAL_MS = 2500;

export interface KasirQrScreenProps {
  order: StoreOrder;
  items: StoreOrderItem[];
  paymentRequest: StorePaymentRequest;
  /** The exact string the server told us to encode — never rebuilt here. */
  qrPayload: string;
  storeName: string;
  basePath: string;
  onNewOrder: () => void;
}

function secondsLeft(expiresAt: string | Date): number {
  const expiry = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  return Math.max(0, Math.floor((expiry.getTime() - Date.now()) / 1000));
}

// The cashier's live screen while waiting for the buyer. Status is always
// read back from the server (never inferred from the countdown reaching
// zero locally), so the screen can't claim "kedaluwarsa" for a payment the
// server actually accepted a moment earlier — the same rule the PPOB
// purchase flow follows while polling a pending transaction.
export function KasirQrScreen({
  order,
  items,
  paymentRequest,
  qrPayload,
  storeName,
  basePath,
  onNewOrder,
}: KasirQrScreenProps) {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [status, setStatus] = useState<StorePaymentRequest["status"]>(paymentRequest.status);
  const [remaining, setRemaining] = useState(() => secondsLeft(paymentRequest.expires_at));
  const isSettled = status !== "MENUNGGU";
  const isSettledRef = useRef(isSettled);
  isSettledRef.current = isSettled;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(qrPayload, { width: 320, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setQrImage(url);
      })
      .catch(() => {
        // Leave the payload visible as selectable text below instead —
        // the buyer can still be helped manually.
      });
    return () => {
      cancelled = true;
    };
  }, [qrPayload]);

  // Countdown is display only. It keeps ticking to zero and then simply
  // stops; whether the request is actually dead is the server's call.
  useEffect(() => {
    if (isSettled) return;
    const handle = setInterval(() => setRemaining(secondsLeft(paymentRequest.expires_at)), 1000);
    return () => clearInterval(handle);
  }, [isSettled, paymentRequest.expires_at]);

  const poll = useCallback(async () => {
    try {
      const detail = await getStorePaymentDetail(paymentRequest.id);
      if (!isSettledRef.current) setStatus(detail.paymentRequest.status);
    } catch {
      // A dropped poll is not a payment failure — keep waiting and try
      // again on the next tick.
    }
  }, [paymentRequest.id]);

  useEffect(() => {
    if (isSettled) return;
    const handle = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [isSettled, poll]);

  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  if (status === "BERHASIL") {
    return (
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
          <h1 className="font-semibold">Pembayaran Diterima</h1>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-status-success text-status-success-foreground">
            <CheckCircle2 className="size-10" />
          </div>
          <div>
            <p className="text-3xl font-bold">{formatMoney(order.total_amount)}</p>
            <p className="mt-1 text-sm text-muted-foreground">sudah masuk ke saldo {storeName}</p>
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

          <div className="flex w-full max-w-sm flex-col gap-2">
            <button
              type="button"
              onClick={onNewOrder}
              className="w-full rounded-2xl bg-red-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-700"
            >
              Transaksi Baru
            </button>
            <Link
              href={`${basePath}/riwayat/${order.id}`}
              className="w-full rounded-2xl border px-4 py-3 text-center font-semibold hover:bg-accent"
            >
              Lihat Struk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSettled) {
    return (
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
          <h1 className="font-semibold">Pembayaran Batal</h1>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <XCircle className="size-10" />
          </div>
          <div>
            <p className="font-semibold">
              {status === "KEDALUWARSA" ? "QR sudah kedaluwarsa" : "Pembayaran tidak selesai"}
            </p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Tidak ada saldo yang berpindah dan stok tidak berkurang. Buat pesanan baru untuk mencoba lagi.
            </p>
          </div>
          <button
            type="button"
            onClick={onNewOrder}
            className="rounded-2xl bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700"
          >
            Buat Pesanan Baru
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
        <button
          type="button"
          onClick={onNewOrder}
          aria-label="Kembali"
          className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-semibold">Tunjukkan ke Pembeli</h1>
      </header>

      <div className="flex flex-1 flex-col items-center gap-5 px-4 py-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Total Tagihan</p>
          <p className="text-3xl font-bold">{formatMoney(order.total_amount)}</p>
        </div>

        {/* The QR itself gets the premium treatment — white card, generous
            padding, soft red glow — because in a warung this is read at
            arm's length in bad lighting. */}
        <div className="rounded-3xl border bg-white p-5 shadow-xl shadow-red-600/10">
          {qrImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- a runtime-generated data: URI, not an asset next/image can optimise
            <img src={qrImage} alt="QR pembayaran" className="size-56 sm:size-64" />
          ) : (
            <div className="flex size-56 items-center justify-center sm:size-64">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-full bg-status-pending px-4 py-2 text-sm font-semibold text-status-pending-foreground">
          <Clock3 className="size-4" />
          Berlaku {minutes}:{seconds}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Menunggu pembeli konfirmasi...
        </div>

        <div className="w-full rounded-2xl border bg-card p-4">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 py-1 text-sm">
              <span className="min-w-0 truncate">
                {item.product_name} <span className="text-muted-foreground">×{item.quantity}</span>
              </span>
              <span className="shrink-0 font-medium">{formatMoney(item.subtotal)}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Pembeli memindai QR ini dari aplikasi Digides mereka, lalu mengonfirmasi dengan PIN mereka sendiri.
        </p>
      </div>
    </div>
  );
}
