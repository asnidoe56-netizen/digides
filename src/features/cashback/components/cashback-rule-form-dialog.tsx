"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/formatting/money";
import type { CashbackProductOption } from "@/repositories/cashback.repository";
import type { CashbackPreview } from "@/services/cashback.service";
import type { CashbackScopeType, CashbackType } from "@/types/cashback";
import { createCashbackRule, previewCashback } from "../services/cashback-api";

export interface CashbackRuleFormDialogProps {
  products: CashbackProductOption[];
  categories: Array<{ id: string; name: string }>;
  brands: Array<{ id: string; name: string }>;
}

const SCOPE_LABEL: Record<CashbackScopeType, string> = {
  PRODUCT: "Satu produk",
  BRAND: "Satu brand",
  CATEGORY: "Satu kategori",
  GLOBAL: "Semua produk",
};

const inputClass = "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

/** Batas daftar saat BELUM memilih kategori — hanya berlaku untuk hasil
 *  pencarian lintas kategori. Setelah kategori dipilih, semua produknya
 *  tampil tanpa batas. */
const UNFILTERED_LIMIT = 80;

// Formulir aturan cashback, dengan peringatan PRD §6.2 yang hidup.
//
// Yang paling penting di sini bukan kolomnya, melainkan kotak di bawahnya:
// berapa yang AKAN benar-benar terbayar. Admin mengetik Rp300; kalau sisa
// margin setelah komisi hanya Rp200, formulir mengatakannya saat itu juga
// — bukan bulan depan, saat seseorang menjumlahkan kerugian yang tidak
// pernah terlihat di layar mana pun.
export function CashbackRuleFormDialog({ products, categories, brands }: CashbackRuleFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [scopeType, setScopeType] = useState<CashbackScopeType>("PRODUCT");
  const [targetId, setTargetId] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [cashbackType, setCashbackType] = useState<CashbackType>("NOMINAL");
  const [cashbackValue, setCashbackValue] = useState("");
  const [maxCashback, setMaxCashback] = useState("");
  const [minTransaction, setMinTransaction] = useState("");
  const [effectiveUntil, setEffectiveUntil] = useState("");

  const [preview, setPreview] = useState<CashbackPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Jumlah produk per kategori, dari daftar produk yang memang bisa dibeli.
  // Dipakai untuk dua hal: menyembunyikan kategori kosong (di produksi ada
  // kategori "Isi Pulsa" lama tanpa produk yang tampil kembar dengan "Pulsa"),
  // dan memberi tahu admin berapa produk yang akan ia lihat.
  const productCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      if (!product.category_id) continue;
      counts.set(product.category_id, (counts.get(product.category_id) ?? 0) + 1);
    }
    return counts;
  }, [products]);

  const categoriesWithProducts = useMemo(
    () => categories.filter((category) => (productCountByCategory.get(category.id) ?? 0) > 0),
    [categories, productCountByCategory],
  );

  // Kategori dipilih DULU, baru produknya.
  //
  // Versi pertama formulir ini menampilkan 60 produk pertama tanpa pilihan
  // kategori, dan pencariannya hanya mencocokkan nama produk dan brand.
  // Hasilnya Pulsa tidak bisa ditemukan sama sekali: produk Pulsa pertama
  // ada di urutan ke-74, dan tidak satu pun dari 71 produk Pulsa yang
  // namanya mengandung kata "pulsa" — namanya "Telkomsel 5.000". Mengetik
  // "pulsa" menghasilkan daftar kosong.
  //
  // Sekarang: pilih kategori, lalu SEMUA produknya tampil. Pencarian juga
  // mencocokkan nama kategori, supaya "pulsa" tetap berhasil walau kategori
  // belum dipilih.
  const filteredProducts = useMemo(() => {
    const needle = productSearch.trim().toLowerCase();
    const inCategory = productCategoryId
      ? products.filter((product) => product.category_id === productCategoryId)
      : products;
    const matched = needle
      ? inCategory.filter(
          (product) =>
            product.product_name.toLowerCase().includes(needle) ||
            (product.brand_name ?? "").toLowerCase().includes(needle) ||
            (product.category_name ?? "").toLowerCase().includes(needle),
        )
      : inCategory;
    return productCategoryId ? matched : matched.slice(0, UNFILTERED_LIMIT);
  }, [products, productCategoryId, productSearch]);

  const unfilteredTotal = useMemo(() => {
    if (productCategoryId) return filteredProducts.length;
    const needle = productSearch.trim().toLowerCase();
    if (!needle) return products.length;
    return products.filter(
      (product) =>
        product.product_name.toLowerCase().includes(needle) ||
        (product.brand_name ?? "").toLowerCase().includes(needle) ||
        (product.category_name ?? "").toLowerCase().includes(needle),
    ).length;
  }, [products, productCategoryId, productSearch, filteredProducts.length]);

  const valueNumber = Number(cashbackValue);
  const maxNumber = maxCashback.trim() === "" ? null : Number(maxCashback);

  // Pratinjau hanya bisa dihitung untuk satu produk: "berapa margin
  // produk ini" punya jawaban tunggal, sedangkan "berapa margin semua
  // produk Telkomsel" tidak. Untuk cakupan lebih luas, pembatas sisa
  // margin tetap bekerja per transaksi saat membayar — hanya tidak bisa
  // ditampilkan sebagai satu angka di sini, dan formulir mengatakannya.
  useEffect(() => {
    if (scopeType !== "PRODUCT" || !targetId || !Number.isFinite(valueNumber) || valueNumber <= 0) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsPreviewing(true);
      try {
        const result = await previewCashback({
          productId: targetId,
          cashbackType,
          cashbackValue: valueNumber,
          maxCashback: maxNumber,
        });
        if (!cancelled) setPreview(result.preview);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setIsPreviewing(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scopeType, targetId, cashbackType, valueNumber, maxNumber]);

  function reset() {
    setScopeType("PRODUCT");
    setTargetId("");
    setProductCategoryId("");
    setProductSearch("");
    setCashbackType("NOMINAL");
    setCashbackValue("");
    setMaxCashback("");
    setMinTransaction("");
    setEffectiveUntil("");
    setPreview(null);
    setError(null);
  }

  const selectedProduct = scopeType === "PRODUCT" ? products.find((product) => product.id === targetId) : undefined;

  const canSubmit =
    Number.isFinite(valueNumber) &&
    valueNumber > 0 &&
    (scopeType === "GLOBAL" || targetId !== "") &&
    !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await createCashbackRule({
        scopeType,
        productId: scopeType === "PRODUCT" ? targetId : null,
        brandId: scopeType === "BRAND" ? targetId : null,
        categoryId: scopeType === "CATEGORY" ? targetId : null,
        cashbackType,
        cashbackValue: valueNumber,
        maxCashback: maxNumber,
        minTransaction: minTransaction.trim() === "" ? null : Number(minTransaction),
        // Akhir hari yang dipilih, bukan tengah malam di awalnya — "berlaku
        // sampai 30 September" berarti termasuk tanggal 30.
        effectiveUntil: effectiveUntil ? new Date(`${effectiveUntil}T23:59:59`).toISOString() : null,
      });
      setOpen(false);
      reset();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal menyimpan aturan cashback.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Tambah Cashback
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah aturan cashback</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Berlaku untuk</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(SCOPE_LABEL) as CashbackScopeType[]).map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => {
                      setScopeType(scope);
                      setTargetId("");
                    }}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      scopeType === scope ? "border-primary bg-primary/10 font-medium" : "hover:bg-accent"
                    }`}
                  >
                    {SCOPE_LABEL[scope]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Kalau satu produk kena beberapa aturan, yang paling spesifik yang dipakai: produk
                mengalahkan brand, brand mengalahkan kategori, kategori mengalahkan semua produk.
              </p>
            </div>

            {scopeType === "PRODUCT" ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cb-product-category" className="text-sm font-medium">
                  Kategori produk
                </label>
                <select
                  id="cb-product-category"
                  value={productCategoryId}
                  onChange={(event) => {
                    setProductCategoryId(event.target.value);
                    setTargetId("");
                  }}
                  className={inputClass}
                >
                  <option value="">Semua kategori</option>
                  {categoriesWithProducts.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} ({productCountByCategory.get(category.id)} produk)
                    </option>
                  ))}
                </select>

                <label htmlFor="cb-product-search" className="mt-2 text-sm font-medium">
                  Produk
                </label>
                <input
                  id="cb-product-search"
                  type="text"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Cari nama produk, brand, atau kategori…"
                  className={inputClass}
                />
                <select
                  value={targetId}
                  onChange={(event) => setTargetId(event.target.value)}
                  size={8}
                  className={inputClass}
                >
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.product_name}
                      {productCategoryId ? "" : ` · ${product.category_name ?? "tanpa kategori"}`} — modal{" "}
                      {formatMoney(product.base_price)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {filteredProducts.length === 0
                    ? "Tidak ada produk yang cocok."
                    : productCategoryId
                      ? `${filteredProducts.length} produk ditampilkan.`
                      : unfilteredTotal > filteredProducts.length
                        ? `Menampilkan ${filteredProducts.length} dari ${unfilteredTotal} produk — pilih kategori untuk melihat semuanya.`
                        : `${filteredProducts.length} produk ditampilkan.`}
                </p>
                {selectedProduct ? (
                  <p className="rounded-md bg-muted px-3 py-2 text-xs">
                    Dipilih: <span className="font-medium">{selectedProduct.product_name}</span>
                    {" · "}
                    {selectedProduct.category_name ?? "tanpa kategori"}
                  </p>
                ) : null}
              </div>
            ) : null}

            {scopeType === "BRAND" || scopeType === "CATEGORY" ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cb-target" className="text-sm font-medium">
                  {scopeType === "BRAND" ? "Brand" : "Kategori"}
                </label>
                <select
                  id="cb-target"
                  value={targetId}
                  onChange={(event) => setTargetId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Pilih…</option>
                  {scopeType === "BRAND"
                    ? brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))
                    : categoriesWithProducts.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name} ({productCountByCategory.get(category.id)} produk)
                        </option>
                      ))}
                </select>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cb-type" className="text-sm font-medium">
                  Jenis
                </label>
                <select
                  id="cb-type"
                  value={cashbackType}
                  onChange={(event) => setCashbackType(event.target.value as CashbackType)}
                  className={inputClass}
                >
                  <option value="NOMINAL">Rupiah tetap</option>
                  <option value="PERCENTAGE">Persen dari margin</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cb-value" className="text-sm font-medium">
                  {cashbackType === "NOMINAL" ? "Cashback (Rp)" : "Cashback (%)"}
                </label>
                <input
                  id="cb-value"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={cashbackType === "PERCENTAGE" ? 100 : undefined}
                  value={cashbackValue}
                  onChange={(event) => setCashbackValue(event.target.value)}
                  placeholder={cashbackType === "NOMINAL" ? "200" : "20"}
                  className={inputClass}
                />
              </div>
            </div>

            {cashbackType === "PERCENTAGE" ? (
              <p className="-mt-2 text-xs text-muted-foreground">
                Persen dihitung dari <strong>margin Digides</strong>, bukan dari harga jual. 10% dari
                harga Rp5.510 adalah Rp551 — lebih besar dari margin Rp500-nya, jadi akan rugi. 10%
                dari margin Rp500 adalah Rp50.
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cb-max" className="text-sm font-medium">
                  Maksimal (Rp) <span className="font-normal text-muted-foreground">· opsional</span>
                </label>
                <input
                  id="cb-max"
                  type="number"
                  min={0}
                  value={maxCashback}
                  onChange={(event) => setMaxCashback(event.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="cb-min" className="text-sm font-medium">
                  Min. transaksi (Rp) <span className="font-normal text-muted-foreground">· opsional</span>
                </label>
                <input
                  id="cb-min"
                  type="number"
                  min={0}
                  value={minTransaction}
                  onChange={(event) => setMinTransaction(event.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cb-until" className="text-sm font-medium">
                Berlaku sampai <span className="font-normal text-muted-foreground">· kosongkan bila tanpa batas</span>
              </label>
              <input
                id="cb-until"
                type="date"
                value={effectiveUntil}
                onChange={(event) => setEffectiveUntil(event.target.value)}
                className={inputClass}
              />
            </div>

            <PreviewBox
              scopeType={scopeType}
              preview={preview}
              isPreviewing={isPreviewing}
              hasInput={Number.isFinite(valueNumber) && valueNumber > 0 && targetId !== ""}
            />

            {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Simpan Aturan
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PreviewBox({
  scopeType,
  preview,
  isPreviewing,
  hasInput,
}: {
  scopeType: CashbackScopeType;
  preview: CashbackPreview | null;
  isPreviewing: boolean;
  hasInput: boolean;
}) {
  if (scopeType !== "PRODUCT") {
    return (
      <div className="rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        Perkiraan pembayaran hanya bisa dihitung untuk satu produk, karena tiap produk punya margin
        sendiri. Untuk cakupan ini, cashback tetap <strong>otomatis dipotong</strong> pada setiap
        transaksi supaya tidak pernah melebihi margin setelah komisi.
      </div>
    );
  }

  if (!hasInput) return null;

  if (isPreviewing && !preview) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        Menghitung…
      </div>
    );
  }

  if (!preview) return null;

  const { calculation } = preview;
  const reduced = calculation.cappedBy !== "NONE";
  const noneLeft = calculation.payable === 0;

  return (
    <div
      className={`flex flex-col gap-2 rounded-md border p-3 text-sm ${
        noneLeft
          ? "border-destructive/40 bg-destructive/5"
          : reduced
            ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
            : "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
      }`}
    >
      <p className="flex items-center gap-2 font-medium">
        {reduced || noneLeft ? (
          <AlertTriangle className="size-4 text-amber-600" />
        ) : (
          <CheckCircle2 className="size-4 text-emerald-600" />
        )}
        {noneLeft
          ? "Cashback ini tidak akan pernah terbayar"
          : `Yang benar-benar terbayar: ${formatMoney(calculation.payable)}`}
      </p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs tabular-nums">
        <span className="text-muted-foreground">Harga jual</span>
        <span className="text-right">{formatMoney(preview.sellingPrice)}</span>
        <span className="text-muted-foreground">Modal Digiflazz</span>
        <span className="text-right">{formatMoney(preview.basePrice)}</span>
        <span className="text-muted-foreground">Margin Digides</span>
        <span className="text-right font-medium">{formatMoney(preview.margin)}</span>
        <span className="text-muted-foreground">Komisi terbesar ke upline</span>
        <span className="text-right">− {formatMoney(preview.worstCaseCommission)}</span>
        <span className="text-muted-foreground">Sisa untuk cashback</span>
        <span className="text-right font-medium">
          {formatMoney(Math.max(preview.margin - preview.worstCaseCommission, 0))}
        </span>
        <span className="text-muted-foreground">Sisa untuk Digides</span>
        <span className="text-right">
          {formatMoney(Math.max(preview.margin - preview.worstCaseCommission - calculation.payable, 0))}
        </span>
      </div>

      {calculation.cappedBy === "REMAINING_MARGIN" ? (
        <p className="text-xs text-muted-foreground">
          Anda meminta {formatMoney(calculation.requested)}, tetapi margin produk ini setelah komisi
          hanya menyisakan {formatMoney(Math.max(preview.margin - preview.worstCaseCommission, 0))}.
          Cashback dipotong ke angka itu supaya Digides tidak rugi pada setiap transaksi.
        </p>
      ) : null}
      {calculation.cappedBy === "MAX_CASHBACK" ? (
        <p className="text-xs text-muted-foreground">
          Dibatasi oleh nilai maksimal yang Anda isi.
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Perkiraan dari harga katalog saat ini. Yang dibayar nanti dihitung dari harga transaksi yang
        sesungguhnya.
      </p>
    </div>
  );
}
