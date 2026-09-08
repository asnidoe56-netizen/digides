"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Minus, PackageOpen, Plus, Search, ShoppingCart } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/formatting/money";
import { cn } from "@/lib/utils";
import type { StoreProduct } from "@/types/store-product";
import { createStoreOrder, type CreateStoreOrderResponse } from "../services/toko-api";
import { KasirQrScreen } from "./kasir-qr-screen";

export interface KasirViewProps {
  storeName: string;
  products: StoreProduct[];
  basePath: string;
}

// The cashier screen: search, tap to add, watch the total, one button to
// turn it into a QR. Deliberately a single screen — a warung transaction
// has to be finishable in seconds (PRD §9's Tahap 4 bar is under 30
// seconds end to end), so there is no multi-step wizard here.
export function KasirView({ storeName, products, basePath }: KasirViewProps) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateStoreOrderResponse | null>(null);

  const sellable = useMemo(() => products.filter((product) => product.is_active), [products]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sellable;
    return sellable.filter((product) => product.name.toLowerCase().includes(needle));
  }, [sellable, query]);

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => {
          const product = products.find((candidate) => candidate.id === productId);
          return product ? { product, quantity } : null;
        })
        .filter((line): line is { product: StoreProduct; quantity: number } => line !== null),
    [cart, products],
  );

  const total = lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  function addOne(product: StoreProduct) {
    setCart((prev) => {
      const next = (prev[product.id] ?? 0) + 1;
      // Stock is the merchant's own figure, so the cashier is stopped here
      // rather than letting the buyer discover it at payment time. The
      // server enforces it again anyway when the payment settles.
      if (next > product.stock) return prev;
      return { ...prev, [product.id]: next };
    });
  }

  function removeOne(productId: string) {
    setCart((prev) => {
      const next = (prev[productId] ?? 0) - 1;
      if (next <= 0) {
        const { [productId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: next };
    });
  }

  async function handleCreateOrder() {
    if (lines.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createStoreOrder(
        lines.map((line) => ({ storeProductId: line.product.id, quantity: line.quantity })),
      );
      setCreated(result);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal membuat pesanan, silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (created) {
    return (
      <KasirQrScreen
        order={created.order}
        items={created.items}
        paymentRequest={created.paymentRequest}
        qrPayload={created.qrPayload}
        storeName={storeName}
        basePath={basePath}
        onNewOrder={() => {
          setCreated(null);
          setCart({});
          setQuery("");
        }}
      />
    );
  }

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
          <h1 className="font-semibold">Kasir</h1>
        </header>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari produk..."
              className="w-full min-w-0 outline-none"
            />
          </div>
        </div>
      </div>

      {/* The extra bottom padding exists only to clear the fixed cart bar,
          so it's applied only while that bar is actually on screen —
          otherwise an empty catalogue would sit above a big dead gap. */}
      <div className={cn("flex flex-1 flex-col gap-2 px-4 pb-6", itemCount > 0 && "pb-40")}>
        {sellable.length === 0 ? (
          <EmptyCatalog basePath={basePath} />
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada produk cocok dengan &ldquo;{query}&rdquo;.
          </p>
        ) : (
          visible.map((product) => {
            const quantity = cart[product.id] ?? 0;
            const isOutOfStock = product.stock === 0;
            const atStockLimit = quantity >= product.stock;

            return (
              <div
                key={product.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border bg-card p-3",
                  quantity > 0 && "border-red-600 ring-1 ring-red-600/20",
                  isOutOfStock && "opacity-60",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(product.price)}
                    <span className="mx-1.5 text-border">|</span>
                    {isOutOfStock ? (
                      <span className="font-medium text-red-600">Stok habis</span>
                    ) : (
                      <>Stok {product.stock}</>
                    )}
                  </p>
                </div>

                {quantity > 0 ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => removeOne(product.id)}
                      aria-label={`Kurangi ${product.name}`}
                      className="flex size-9 items-center justify-center rounded-full border text-red-600 hover:bg-accent"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-7 text-center font-semibold tabular-nums">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => addOne(product)}
                      disabled={atStockLimit}
                      aria-label={`Tambah ${product.name}`}
                      className="flex size-9 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => addOne(product)}
                    disabled={isOutOfStock}
                    className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                  >
                    Tambah
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* The running total follows the cashier down the list instead of
          sitting at the bottom of the page, so "berapa totalnya?" is
          always answerable without scrolling. */}
      {itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-lg border-t bg-background px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)]">
          {error ? (
            <p className="mb-2 rounded-xl bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">{error}</p>
          ) : null}
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShoppingCart className="size-4" />
              {itemCount} item
            </span>
            <span className="text-lg font-bold">{formatMoney(total)}</span>
          </div>
          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            {isSubmitting ? "Membuat QR..." : "Buat QR Pembayaran"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function EmptyCatalog({ basePath }: { basePath: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <PackageOpen className="size-6" />
      </span>
      <div>
        <p className="font-semibold">Belum ada produk aktif</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tambahkan produk dulu supaya bisa dijual lewat kasir.
        </p>
      </div>
      <Link
        href={`${basePath}/produk`}
        className="rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
      >
        Kelola Produk
      </Link>
    </div>
  );
}
