"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Boxes, Loader2, PackagePlus, Pencil, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/formatting/money";
import { cn } from "@/lib/utils";
import type { StoreProduct } from "@/types/store-product";
import {
  adjustStoreProductStock,
  createStoreProduct,
  updateStoreProduct,
} from "../services/toko-api";

export interface ProdukViewProps {
  products: StoreProduct[];
  basePath: string;
}

type OpenDialog =
  | { kind: "create" }
  | { kind: "edit"; product: StoreProduct }
  | { kind: "stock"; product: StoreProduct }
  | null;

export function ProdukView({ products, basePath }: ProdukViewProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggleActive(product: StoreProduct) {
    if (togglingId) return;
    setTogglingId(product.id);
    try {
      await updateStoreProduct(product.id, { isActive: !product.is_active });
      router.refresh();
    } catch {
      // Nothing changed server-side, so the row simply stays as it was.
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
        <Link
          href={basePath}
          aria-label="Kembali"
          className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="flex-1 font-semibold">Produk Toko</h1>
        <button
          type="button"
          onClick={() => setDialog({ kind: "create" })}
          aria-label="Tambah produk"
          className="flex size-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
        >
          <Plus className="size-5" />
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <PackagePlus className="size-6" />
            </span>
            <div>
              <p className="font-semibold">Belum ada produk</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tambahkan barang yang biasa Anda jual — nama, harga, dan stoknya.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDialog({ kind: "create" })}
              className="rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Tambah Produk
            </button>
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn("truncate font-medium", !product.is_active && "text-muted-foreground")}>
                    {product.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney(product.price)}
                    <span className="mx-1.5 text-border">|</span>
                    <span className={cn(product.stock === 0 && "font-medium text-red-600")}>
                      Stok {product.stock}
                    </span>
                  </p>
                </div>

                {/* A plain switch, not a badge — the merchant needs to
                    change this constantly (barang habis, barang datang),
                    so it has to be one tap from the list itself. */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={product.is_active}
                  aria-label={product.is_active ? `Nonaktifkan ${product.name}` : `Aktifkan ${product.name}`}
                  onClick={() => handleToggleActive(product)}
                  disabled={togglingId === product.id}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
                    product.is_active ? "bg-red-600" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-5 rounded-full bg-white shadow transition-all",
                      product.is_active ? "left-[1.375rem]" : "left-0.5",
                    )}
                  />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDialog({ kind: "stock", product })}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-medium hover:bg-accent"
                >
                  <Boxes className="size-4" />
                  Stok
                </button>
                <button
                  type="button"
                  onClick={() => setDialog({ kind: "edit", product })}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-sm font-medium hover:bg-accent"
                >
                  <Pencil className="size-4" />
                  Ubah
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {dialog?.kind === "create" ? (
        <ProductFormDialog
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            router.refresh();
          }}
        />
      ) : null}

      {dialog?.kind === "edit" ? (
        <ProductFormDialog
          product={dialog.product}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            router.refresh();
          }}
        />
      ) : null}

      {dialog?.kind === "stock" ? (
        <StockDialog
          product={dialog.product}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

// One dialog for both create and edit — the only difference is whether
// stock is asked for (an existing product's stock moves through the
// event-logged stock dialog instead, never by overwriting a number).
function ProductFormDialog({
  product,
  onClose,
  onSaved,
}: {
  product?: StoreProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(product);
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(Math.round(Number(product.price))) : "");
  const [stock, setStock] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceNumber = Number(price);
  const stockNumber = Number(stock);
  const canSubmit =
    name.trim().length > 0 &&
    Number.isInteger(priceNumber) &&
    priceNumber > 0 &&
    (isEdit || (Number.isInteger(stockNumber) && stockNumber >= 0)) &&
    !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (product) {
        await updateStoreProduct(product.id, { name: name.trim(), price: priceNumber });
      } else {
        await createStoreProduct({ name: name.trim(), price: priceNumber, stock: stockNumber });
      }
      onSaved();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal menyimpan produk.");
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Ubah Produk" : "Tambah Produk"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="product-name" className="text-sm font-medium">
              Nama Produk
            </label>
            <input
              id="product-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="Contoh: Indomie Goreng"
              className="rounded-xl border px-3 py-2.5 outline-none focus:border-red-600"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="product-price" className="text-sm font-medium">
              Harga Jual
            </label>
            <input
              id="product-price"
              type="number"
              inputMode="numeric"
              min={1}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="3000"
              className="rounded-xl border px-3 py-2.5 outline-none focus:border-red-600"
            />
            {priceNumber > 0 ? (
              <p className="text-xs text-muted-foreground">{formatMoney(priceNumber)}</p>
            ) : null}
          </div>

          {!isEdit ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="product-stock" className="text-sm font-medium">
                Stok Awal
              </label>
              <input
                id="product-stock"
                type="number"
                inputMode="numeric"
                min={0}
                value={stock}
                onChange={(event) => setStock(event.target.value)}
                className="rounded-xl border px-3 py-2.5 outline-none focus:border-red-600"
              />
            </div>
          ) : (
            <p className="rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              Stok diubah lewat tombol <span className="font-medium">Stok</span> supaya setiap perubahannya tercatat.
            </p>
          )}

          {error ? (
            <p className="rounded-xl bg-status-failed px-3 py-2.5 text-sm text-status-failed-foreground">{error}</p>
          ) : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Simpan
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const QUICK_ADD = [1, 5, 10, 25];

// Stock moves by a signed delta, never by typing an absolute figure —
// mirroring the API, so every movement stays explainable in the product's
// own history ("+24 restock" rather than "someone set it to 25").
function StockDialog({
  product,
  onClose,
  onSaved,
}: {
  product: StoreProduct;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [delta, setDelta] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resulting = product.stock + delta;
  const canSubmit = delta !== 0 && resulting >= 0 && !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await adjustStoreProductStock(product.id, delta);
      onSaved();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal memperbarui stok.");
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ubah Stok</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="rounded-2xl border p-4 text-center">
            <p className="truncate text-sm text-muted-foreground">{product.name}</p>
            <div className="mt-1 flex items-baseline justify-center gap-2">
              <span className="text-sm text-muted-foreground line-through">{product.stock}</span>
              <span className="text-3xl font-bold tabular-nums">{resulting}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {delta > 0 ? `Menambah ${delta}` : delta < 0 ? `Mengurangi ${Math.abs(delta)}` : "Belum ada perubahan"}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {QUICK_ADD.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setDelta((prev) => prev + amount)}
                className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-accent"
              >
                +{amount}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDelta((prev) => prev - 1)}
              disabled={resulting <= 0}
              className="rounded-full border px-4 py-2 text-sm font-semibold hover:bg-accent disabled:opacity-40"
            >
              −1
            </button>
            <button
              type="button"
              onClick={() => setDelta(0)}
              className="rounded-full border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
            >
              Reset
            </button>
          </div>

          {error ? (
            <p className="rounded-xl bg-status-failed px-3 py-2.5 text-sm text-status-failed-foreground">{error}</p>
          ) : null}

          <DialogFooter>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Simpan Perubahan
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
