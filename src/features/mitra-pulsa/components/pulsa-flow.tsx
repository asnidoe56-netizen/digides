"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { formatMoney } from "@/lib/formatting/money";
import { cn } from "@/lib/utils";
import type { Brand, Product } from "@/types/product";

export interface PulsaFlowProps {
  homeHref: string;
  brands: Brand[];
  products: Product[];
  categoryMarkup: string;
  availableBalance: string;
}

const PHONE_REGEX = /^08[0-9]{8,12}$/;

// "Axis 5.000" -> "5.000" — the nominal is always the trailing numeric
// token Digiflazz's product_name already carries; no separate nominal
// column exists to read instead.
function extractNominalLabel(productName: string): string {
  const match = productName.match(/([\d.,]+)\s*$/);
  return match ? match[1] : productName;
}

export function PulsaFlow({ homeHref, brands, products, categoryMarkup, availableBalance }: PulsaFlowProps) {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const normalizedPhone = phoneNumber.replace(/\s+/g, "");
  const isPhoneValid = PHONE_REGEX.test(normalizedPhone);

  const brandProducts = useMemo(
    () => (selectedBrandId ? products.filter((product) => product.brand_id === selectedBrandId) : []),
    [products, selectedBrandId],
  );

  const selectedBrand = brands.find((brand) => brand.id === selectedBrandId) ?? null;
  const selectedProduct = brandProducts.find((product) => product.id === selectedProductId) ?? null;
  const sellingPrice = selectedProduct ? Number(selectedProduct.base_price) + Number(categoryMarkup) : 0;

  function handleSelectBrand(brandId: string) {
    setSelectedBrandId(brandId);
    setSelectedProductId(null);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
        <button
          type="button"
          onClick={() => (selectedBrandId ? setSelectedBrandId(null) : router.push(homeHref))}
          aria-label="Kembali"
          className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-semibold">{selectedBrand ? `Pulsa - ${selectedBrand.name}` : "Pulsa"}</h1>
      </header>

      <div className={cn("flex flex-1 flex-col gap-5 p-4", selectedProduct && "pb-32")}>
        <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Nomor Tujuan</p>
            {selectedBrandId ? (
              <p className="font-medium">{phoneNumber}</p>
            ) : (
              <input
                type="tel"
                inputMode="numeric"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="08xx xxxx xxxx"
                className="w-full bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
              />
            )}
          </div>
          {selectedBrandId ? (
            <button type="button" onClick={() => setSelectedBrandId(null)} className="text-sm font-medium text-red-600">
              Ubah
            </button>
          ) : null}
        </div>

        {!selectedBrandId ? (
          <div className="flex flex-col gap-3">
            <p className="font-semibold">Pilih Provider</p>
            {!isPhoneValid && phoneNumber.length > 0 ? (
              <p className="text-xs text-destructive">Nomor HP tidak valid — gunakan format 08xxxxxxxxxx.</p>
            ) : null}
            <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:gap-x-3">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  disabled={!isPhoneValid}
                  onClick={() => handleSelectBrand(brand.id)}
                  className="flex h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center disabled:opacity-40"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-600">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="line-clamp-2 w-full break-words text-[11px] leading-tight font-medium">
                    {brand.name}
                  </span>
                </button>
              ))}
            </div>
            {!isPhoneValid ? (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Isi nomor tujuan yang valid untuk memilih provider.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="font-semibold">Pilih Nominal</p>
            <div className="grid grid-cols-3 gap-3">
              {brandProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProductId(product.id)}
                  className={cn(
                    "rounded-lg border py-3 text-center text-sm font-medium",
                    product.id === selectedProductId ? "border-red-600 bg-red-600 text-white" : "hover:border-red-300",
                  )}
                >
                  {extractNominalLabel(product.product_name)}
                </button>
              ))}
            </div>
            {brandProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada produk aktif untuk provider ini.</p>
            ) : null}

            <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Pilih provider sesuai kartu pelanggan.</p>
          </div>
        )}
      </div>

      {selectedProduct ? (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-lg flex-col gap-3 border-t bg-background p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Harga</span>
            <span className="font-semibold">{formatMoney(sellingPrice)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Saldo Tersedia</span>
            <span className="font-semibold">{formatMoney(availableBalance)}</span>
          </div>
          <button
            type="button"
            disabled
            title="Segera hadir"
            className="rounded-full bg-red-600/50 py-3 text-center font-semibold text-white"
          >
            Lanjutkan
          </button>
        </div>
      ) : null}
    </div>
  );
}
