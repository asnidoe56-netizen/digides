"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Package,
  QrCode,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Store as StoreIcon,
  Wallet,
} from "lucide-react";
import { formatMoney } from "@/lib/formatting/money";
import type { Store } from "@/types/store";
import type { StoreOrder } from "@/types/store-order";
import type { Wallet as WalletType } from "@/types/wallet";
import { getMyStore } from "../services/toko-api";
import { StoreOrderStatusBadge, StoreStatusBadge } from "./store-status-badge";
import { SettleBalanceDialog } from "./settle-balance-dialog";
import { StoreRegisterForm } from "./store-register-form";

export interface StoreSettlementSummary {
  id: string;
  amount: string;
  created_at: Date | string;
}

export interface TokoViewProps {
  store: Store | null;
  wallet: WalletType | null;
  recentOrders: StoreOrder[];
  /** "Kapan saya memindahkan uang keluar" — the ledger has always
   *  recorded these, but nothing showed them to the merchant. */
  recentSettlements: StoreSettlementSummary[];
  /** e.g. "/dashboard/bumdes/toko" — every sub-route is derived from it. */
  basePath: string;
  homeHref: string;
}

// The Toko section's home. Three genuinely different screens rather than
// one screen with things greyed out, because the three states are three
// different jobs: convince, wait, operate.
export function TokoView({
  store,
  wallet,
  recentOrders,
  recentSettlements,
  basePath,
  homeHref,
}: TokoViewProps) {
  if (!store) {
    return <TokoOnboarding homeHref={homeHref} />;
  }
  if (store.status !== "ACTIVE") {
    return <TokoPending store={store} homeHref={homeHref} />;
  }
  return (
    <TokoDashboard
      store={store}
      wallet={wallet}
      recentOrders={recentOrders}
      recentSettlements={recentSettlements}
      basePath={basePath}
      homeHref={homeHref}
    />
  );
}

function TokoHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
      <Link
        href={backHref}
        aria-label="Kembali"
        className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="font-semibold">{title}</h1>
    </header>
  );
}

// --- Belum punya toko ---------------------------------------------------

const SELLING_POINTS = [
  {
    icon: Wallet,
    title: "Belanja pelanggan jadi saldo",
    body: "Pelanggan bayar pakai saldo Digides, saldo toko Anda langsung bertambah.",
  },
  {
    icon: QrCode,
    title: "Cukup tunjukkan QR",
    body: "Tidak perlu mesin EDC. Buat pesanan, tunjukkan QR, pembeli konfirmasi dengan PIN-nya sendiri.",
  },
  {
    icon: ShieldCheck,
    title: "Saldo toko terpisah",
    body: "Uang toko tidak pernah tercampur dengan saldo pribadi Anda.",
  },
];

function TokoOnboarding({ homeHref }: { homeHref: string }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();

  if (isRegistering) {
    return (
      <StoreRegisterForm
        onCancel={() => setIsRegistering(false)}
        onRegistered={() => router.refresh()}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <TokoHeader title="Digides Toko" backHref={homeHref} />

      {/* The pitch, in the app's own hero language (red gradient +
          rounded-b-3xl + glass panel) so this reads as part of Digides
          rather than a bolted-on promo page. */}
      <div className="bg-linear-to-br from-red-500 to-red-700 px-4 pt-6 pb-8 text-white sm:rounded-3xl">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <StoreIcon className="size-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold leading-snug">
          Jualan sembako Anda
          <br />
          otomatis jadi modal jualan pulsa.
        </h2>
        <p className="mt-2 text-sm text-white/85">
          Terima pembayaran pelanggan sebagai saldo Digides, lalu pakai saldo itu untuk kulakan pulsa dan token —
          tanpa perlu ke bank.
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4 py-6">
        {SELLING_POINTS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3 rounded-2xl border bg-card p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto px-4 pb-6">
        <button
          type="button"
          onClick={() => setIsRegistering(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-700"
        >
          Buka Toko Saya
          <ArrowRight className="size-4" />
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Gratis. Toko akan aktif setelah diverifikasi tim Digides.
        </p>
      </div>
    </div>
  );
}

// --- Menunggu verifikasi -------------------------------------------------

function TokoPending({ store, homeHref }: { store: Store; homeHref: string }) {
  const isBlocked = store.status === "SUSPENDED" || store.status === "CLOSED";

  return (
    <div className="flex flex-1 flex-col">
      <TokoHeader title="Digides Toko" backHref={homeHref} />

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <div
          className={`flex size-16 items-center justify-center rounded-3xl ${
            isBlocked ? "bg-status-failed text-status-failed-foreground" : "bg-status-pending text-status-pending-foreground"
          }`}
        >
          <Clock3 className="size-7" />
        </div>

        <div>
          <h2 className="text-lg font-semibold">{store.name}</h2>
          <div className="mt-2 flex justify-center">
            <StoreStatusBadge status={store.status} />
          </div>
        </div>

        <p className="max-w-xs text-sm text-muted-foreground">
          {isBlocked
            ? "Toko Anda sedang tidak bisa menerima pembayaran. Hubungi tim Digides untuk informasi lebih lanjut."
            : "Pendaftaran toko Anda sudah kami terima. Begitu diverifikasi, kasir dan katalog produk langsung bisa dipakai."}
        </p>

        <Link
          href={homeHref}
          className="mt-2 rounded-2xl border px-5 py-2.5 text-sm font-semibold hover:bg-accent"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}

// --- Toko aktif ----------------------------------------------------------

function TokoDashboard({
  store,
  wallet,
  recentOrders,
  recentSettlements,
  basePath,
  homeHref,
}: {
  store: Store;
  wallet: WalletType | null;
  recentOrders: StoreOrder[];
  recentSettlements: StoreSettlementSummary[];
  basePath: string;
  homeHref: string;
}) {
  const [visible, setVisible] = useState(true);
  const [balance, setBalance] = useState(wallet?.available_balance ?? "0");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  // Same discipline as the Beranda balance card: always re-read from the
  // server, never recompute locally, so the figure on screen can't drift
  // from what a purchase would actually spend.
  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const result = await getMyStore();
      setBalance(result.wallet?.available_balance ?? "0");
    } catch {
      // Transient hiccup — keep the last-known figure rather than blanking it.
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-20 flex flex-col rounded-b-3xl bg-linear-to-br from-red-500 to-red-700 px-4 pt-3 pb-6 text-white sm:rounded-3xl">
        <div className="flex items-center gap-3">
          <Link
            href={homeHref}
            aria-label="Kembali"
            className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{store.name}</p>
            <p className="text-xs text-white/80">Digides Toko</p>
          </div>
          <StoreStatusBadge status={store.status} className="bg-white/15 text-white" />
        </div>

        <div className="mt-4 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-xs text-white/80">Saldo Toko</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-2xl font-bold">{visible ? formatMoney(balance) : "Rp••••••"}</p>
            <button
              type="button"
              onClick={() => setVisible((prev) => !prev)}
              aria-label={visible ? "Sembunyikan saldo" : "Tampilkan saldo"}
              className="shrink-0 text-white/80 hover:text-white"
            >
              {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh saldo toko"
              className="shrink-0 text-white/80 hover:text-white disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="mt-2 text-xs text-white/75">
            Pindahkan ke saldo utama Anda untuk dipakai kulakan pulsa &amp; token.
          </p>

          <button
            type="button"
            onClick={() => setIsSettling(true)}
            disabled={Number(balance) <= 0}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-50"
          >
            <ArrowDownToLine className="size-4" />
            Pindahkan ke Saldo Utama
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-4 py-5">
        {/* Kasir is the whole point of this screen, so it gets a full-width
            primary action rather than being one of four equal tiles. */}
        <Link
          href={`${basePath}/kasir`}
          className="flex items-center gap-3 rounded-2xl bg-red-600 px-4 py-4 font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-700"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-white/15">
            <QrCode className="size-5" />
          </span>
          <span className="flex-1">
            Buka Kasir
            <span className="block text-xs font-normal text-white/80">Pilih produk, tunjukkan QR ke pembeli</span>
          </span>
          <ChevronRight className="size-5 text-white/80" />
        </Link>

        <div className="grid grid-cols-2 gap-3">
          <Link
            href={`${basePath}/produk`}
            className="flex flex-col gap-2 rounded-2xl border bg-card p-4 hover:bg-accent"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Package className="size-5" />
            </span>
            <span className="text-sm font-semibold">Produk</span>
            <span className="text-xs text-muted-foreground">Harga, stok, aktif/nonaktif</span>
          </Link>

          <Link
            href={`${basePath}/riwayat`}
            className="flex flex-col gap-2 rounded-2xl border bg-card p-4 hover:bg-accent"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ReceiptText className="size-5" />
            </span>
            <span className="text-sm font-semibold">Riwayat</span>
            <span className="text-xs text-muted-foreground">Penjualan &amp; struk</span>
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Penjualan Terakhir</h2>
            {recentOrders.length > 0 ? (
              <Link href={`${basePath}/riwayat`} className="flex items-center text-sm font-medium text-red-600">
                Lihat Semua
                <ChevronRight className="size-4" />
              </Link>
            ) : null}
          </div>

          {recentOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-6 text-center">
              <p className="text-sm font-medium">Belum ada penjualan</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Buka Kasir untuk membuat transaksi pertama toko Anda.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentOrders.map((order) => (
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
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <StoreOrderStatusBadge status={order.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Shown only once there is something to show — a merchant who has
          never moved money doesn't need an empty card explaining a
          feature they haven't used. */}
      {recentSettlements.length > 0 ? (
        <div className="flex flex-col gap-3 px-4 pb-6">
          <h2 className="font-semibold">Pemindahan Terakhir</h2>
          <div className="flex flex-col gap-2">
            {recentSettlements.map((settlement) => (
              <div
                key={settlement.id}
                className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <ArrowDownToLine className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{formatMoney(settlement.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(settlement.created_at).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">ke Saldo Utama</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {isSettling ? (
        <SettleBalanceDialog storeBalance={balance} onClose={() => setIsSettling(false)} />
      ) : null}
    </div>
  );
}
