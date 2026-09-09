"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Barcode, Boxes, Loader2, PackagePlus, Pencil, Percent, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/formatting/money";
import { cn } from "@/lib/utils";
import type { StoreProduct, StoreProductCategory } from "@/types/store-product";
import { computeMargin, formatMarginPercent, priceFromMarginPercent } from "../lib/margin";
import {
  adjustStoreProductStock,
  createStoreProduct,
  updateStoreProduct,
} from "../services/toko-api";

export interface ProdukViewProps {
  products: StoreProduct[];
  categories: StoreProductCategory[];
  basePath: string;
}

type OpenDialog =
  | { kind: "create" }
  | { kind: "edit"; product: StoreProduct }
  | { kind: "stock"; product: StoreProduct }
  | null;

export function ProdukView({ products, categories, basePath }: ProdukViewProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

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
        <h1 className="flex-1 font-semibold">Kelola Produk</h1>
      </header>

      {/* The add action moved out of the header and down here, with words
          on it. In the header a bare "+" sat a thumb-width from the back
          arrow — the two most different actions on the screen, side by
          side at the far end of a one-handed reach — and an icon alone
          left the owner guessing: add a product, add stock, add a
          category? */}
      {products.length > 0 ? (
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={() => setDialog({ kind: "create" })}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700"
          >
            <Plus className="size-5" />
            Tambah Produk
          </button>
        </div>
      ) : null}

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
                  {/* Second line only appears when there is something to
                      say. A product with no barcode, no category and no
                      modal is still perfectly normal — it just gets the
                      quieter row it had before Kasir Pintar, rather than
                      three empty placeholders nagging the owner. */}
                  <ProductMetaLine product={product} categoryName={categoryNameById.get(product.category_id ?? "")} />
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
          categories={categories}
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
          categories={categories}
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

// The quiet second line under a product: its category, whether it can be
// scanned, and what it earns. Renders nothing at all when the owner has
// filled none of the three in — the point is to reward filling them, not
// to nag about empty fields.
function ProductMetaLine({ product, categoryName }: { product: StoreProduct; categoryName?: string }) {
  const margin = computeMargin(Number(product.price), product.cost_price === null ? null : Number(product.cost_price));
  const hasBarcode = Boolean(product.barcode);

  if (!categoryName && !hasBarcode && !margin) return null;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
      {categoryName ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{categoryName}</span>
      ) : null}
      {hasBarcode ? (
        <span
          className="flex items-center gap-1 text-muted-foreground"
          title={`Barcode ${product.barcode}`}
        >
          <Barcode className="size-3.5" />
        </span>
      ) : null}
      {margin ? (
        <span
          className={cn(
            "font-medium",
            margin.profit > 0 ? "text-emerald-600" : margin.profit < 0 ? "text-red-600" : "text-muted-foreground",
          )}
        >
          {margin.profit >= 0 ? "Untung " : "Rugi "}
          {formatMoney(Math.abs(margin.profit))}
          {margin.percent !== null ? ` · ${formatMarginPercent(margin.percent)}` : null}
        </span>
      ) : null}
    </div>
  );
}

// One dialog for both create and edit — the only difference is whether
// stock is asked for (an existing product's stock moves through the
// event-logged stock dialog instead, never by overwriting a number).
//
// PRD Kasir Pintar §6.7 shapes the field order: Modal sits directly above
// Harga Jual, with the margin reading live between them, because that is
// the sentence a shopkeeper actually thinks in — "beli 10 ribu, jual 12
// ribu, untung 2 ribu". Percent is a helper button, never the field of
// record.
function ProductFormDialog({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product?: StoreProduct;
  categories: StoreProductCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(product);
  const [name, setName] = useState(product?.name ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [cost, setCost] = useState(
    product?.cost_price == null ? "" : String(Math.round(Number(product.cost_price))),
  );
  const [price, setPrice] = useState(product ? String(Math.round(Number(product.price))) : "");
  const [stock, setStock] = useState("0");
  const [marginPercentOpen, setMarginPercentOpen] = useState(false);
  const [marginPercent, setMarginPercent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceNumber = Number(price);
  const stockNumber = Number(stock);
  // Empty modal is a real, supported state (§6.7), so "" becomes null
  // rather than 0 — the two mean very different things in the report.
  const costNumber = cost.trim() === "" ? null : Number(cost);
  const costIsValid = costNumber === null || (Number.isInteger(costNumber) && costNumber >= 0);

  const margin =
    costIsValid && Number.isFinite(priceNumber) && priceNumber > 0
      ? computeMargin(priceNumber, costNumber)
      : null;

  const canSubmit =
    name.trim().length > 0 &&
    Number.isInteger(priceNumber) &&
    priceNumber > 0 &&
    costIsValid &&
    (isEdit || (Number.isInteger(stockNumber) && stockNumber >= 0)) &&
    !isSubmitting;

  // The "isi margin %" helper: fills Harga Jual and gets out of the way.
  // Deliberately one-directional — it writes the price once and never
  // watches it afterwards, so an owner who then types their own round
  // number isn't fighting a field that keeps recalculating underneath them.
  function applyMarginPercent() {
    const percent = Number(marginPercent);
    if (costNumber === null || costNumber <= 0 || !Number.isFinite(percent)) return;
    const suggested = priceFromMarginPercent(costNumber, percent);
    if (suggested === null) return;
    setPrice(String(suggested));
    setMarginPercentOpen(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // null, not undefined, for the three optional fields: on edit these
      // must be able to CLEAR a value the owner no longer wants (a
      // mistyped barcode, a modal they don't stand behind). The API
      // distinguishes "absent" from "null" exactly for this.
      const optional = {
        barcode: barcode.trim() === "" ? null : barcode.trim(),
        categoryId: categoryId === "" ? null : categoryId,
        costPrice: costNumber,
      };
      if (product) {
        await updateStoreProduct(product.id, { name: name.trim(), price: priceNumber, ...optional });
      } else {
        await createStoreProduct({
          name: name.trim(),
          price: priceNumber,
          stock: stockNumber,
          ...optional,
        });
      }
      onSaved();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal menyimpan produk.");
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-sm">
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
            <label htmlFor="product-barcode" className="flex items-center gap-1.5 text-sm font-medium">
              <Barcode className="size-4 text-muted-foreground" />
              Barcode
              <span className="font-normal text-muted-foreground">· opsional</span>
            </label>
            <input
              id="product-barcode"
              type="text"
              inputMode="numeric"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              maxLength={64}
              placeholder="Ketik atau pindai dari aplikasi"
              className="rounded-xl border px-3 py-2.5 font-mono text-sm outline-none focus:border-red-600"
            />
            {/* §6.4, said plainly rather than hidden: the camera lives in
                Flutter, and a web form that silently lacks it would look
                broken to an owner who scanned on their phone yesterday. */}
            <p className="text-xs text-muted-foreground">
              Pemindai kamera ada di aplikasi Digides Mitra. Di web, barcode diketik.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="product-category" className="text-sm font-medium">
              Kategori <span className="font-normal text-muted-foreground">· opsional</span>
            </label>
            <select
              id="product-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="rounded-xl border bg-background px-3 py-2.5 outline-none focus:border-red-600"
            >
              <option value="">Tanpa kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Dipakai untuk tab kategori di kasir dan laporan untung per kategori.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="product-cost" className="text-sm font-medium">
              Modal <span className="font-normal text-muted-foreground">· harga beli, opsional</span>
            </label>
            <input
              id="product-cost"
              type="number"
              inputMode="numeric"
              min={0}
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="Kosongkan bila belum tahu"
              className="rounded-xl border px-3 py-2.5 outline-none focus:border-red-600"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="product-price" className="text-sm font-medium">
                Harga Jual
              </label>
              {costNumber !== null && costNumber > 0 ? (
                <button
                  type="button"
                  onClick={() => setMarginPercentOpen((open) => !open)}
                  className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
                >
                  <Percent className="size-3" />
                  Isi margin %
                </button>
              ) : null}
            </div>

            {marginPercentOpen ? (
              <div className="flex items-center gap-2 rounded-xl bg-muted p-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  autoFocus
                  value={marginPercent}
                  onChange={(event) => setMarginPercent(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter must not submit the whole form from inside a
                    // helper field — it applies the suggestion instead.
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyMarginPercent();
                    }
                  }}
                  placeholder="20"
                  className="w-20 rounded-lg border px-2.5 py-1.5 text-sm outline-none focus:border-red-600"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <button
                  type="button"
                  onClick={applyMarginPercent}
                  className="ml-auto rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Hitung
                </button>
              </div>
            ) : null}

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

            {/* The live margin line — the reason modal is worth typing at
                all. When modal is empty this says so outright instead of
                showing Rp0 profit, which would be a made-up number (§10). */}
            {priceNumber > 0 ? (
              margin ? (
                <p
                  className={cn(
                    "text-xs font-medium",
                    margin.profit > 0 ? "text-emerald-600" : margin.profit < 0 ? "text-red-600" : "text-muted-foreground",
                  )}
                >
                  {margin.profit >= 0 ? "Untung " : "Rugi "}
                  {formatMoney(Math.abs(margin.profit))}
                  {margin.percent !== null ? ` · ${formatMarginPercent(margin.percent)}` : null}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {formatMoney(priceNumber)} · modal belum diisi, produk ini belum masuk laporan untung
                </p>
              )
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
