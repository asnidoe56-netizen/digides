"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/formatting/money";
import { cn } from "@/lib/utils";
import type { Brand, Product } from "@/types/product";
import { PurchaseConfirmationScreen } from "./purchase-confirmation-screen";
import { PurchasePinScreen } from "./purchase-pin-screen";
import { PurchaseResultScreen, type PurchaseResultStatus } from "./purchase-result-screen";
import { executePurchase } from "../services/purchase-api";

export interface CustomerIdFieldConfig {
  /** e.g. "Nomor Tujuan" (telco/e-money/PLN) or "ID Game" (Games). */
  label: string;
  placeholder: string;
  /** Regex source (no flags) as a plain string, not a RegExp instance —
   *  this config crosses the Server -> Client Component boundary (a page
   *  built as a Server Component passes it down to this "use client"
   *  component), and RegExp instances aren't serializable across that
   *  boundary ("Only plain objects... can be passed to Client Components
   *  from Server Components"). Compiled into a RegExp locally instead. */
  pattern: string;
  invalidMessage: string;
  helperMessage: string;
}

// Telco/e-money/voucher categories all key off an Indonesian phone number
// — this stays the default so none of those pages need to pass
// customerIdField at all. Utility/token top-ups identified by a customer
// or meter ID instead (PLN, Gas, pay-TV) use customer-id-presets.ts's
// NUMERIC_ID_FIELD.
const DEFAULT_CUSTOMER_ID_FIELD: CustomerIdFieldConfig = {
  label: "Nomor Tujuan",
  placeholder: "08xx xxxx xxxx",
  pattern: "^08[0-9]{8,12}$",
  invalidMessage: "Nomor HP tidak valid — gunakan format 08xxxxxxxxxx.",
  helperMessage: "Isi nomor tujuan yang valid untuk memilih provider.",
};

export interface CategoryPurchaseFlowProps {
  /** Display name shown in the header/confirmation — the same string
   *  passed to getCategoryPurchaseCatalog() to fetch brands/products. */
  categoryName: string;
  homeHref: string;
  brands: Brand[];
  products: Product[];
  categoryMarkup: string;
  availableBalance: string;
  /** Override for categories whose customer_no isn't a phone number —
   *  Games needs a numeric player ID, optionally with a zone ID in
   *  parentheses (e.g. "123456789(1001)" for Mobile Legends). Omitted
   *  entirely defaults to phone-number validation. */
  customerIdField?: CustomerIdFieldConfig;
}

type Phase = "browse" | "confirm" | "pin" | "result";

// "Axis 5.000" -> "5.000", "DANA 20.000" -> "20.000" — the nominal is
// usually the trailing numeric token Digiflazz's product_name already
// carries; no separate nominal column exists to read instead. Data and
// Aktivasi Voucher packages have no such trailing number, and instead
// repeat words already shown elsewhere on screen — "Telkomsel Data Flash
// 1 GB 30 Hari" repeats the brand row above it, "Aktivasi Voucher Axis 1
// GB 1 Hari" repeats both the category name and the brand row. Stripping
// a leading categoryName prefix, then a leading brandName prefix off
// whatever remains, collapses both down to just "Data Flash 1 GB 30 Hari"
// / "1 GB 1 Hari" without touching product_names that don't have either
// prefix (a no-op there, so every earlier category's output is
// unaffected). Falls back to the untouched name for anything neither
// pattern covers (e.g. E-Money's "Cek Nama Pengguna DANA" lookup product,
// brand name at the end, not the start; or Games' "Diamond" packages,
// which end in a word, not a number).
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractNominalLabel(productName: string, categoryName?: string, brandName?: string): string {
  // Collapse Digiflazz's occasional double-space typos ("Kartu  4 Bulan")
  // before anything else, so neither the prefix strips below nor the
  // fallback display ever show one.
  let name = productName.replace(/\s+/g, " ").trim();
  if (categoryName) {
    name = name.replace(new RegExp(`^${escapeRegExp(categoryName.trim())}\\s+`, "i"), "");
  }
  if (brandName) {
    name = name.replace(new RegExp(`^${escapeRegExp(brandName.trim())}\\s+`, "i"), "");
  }
  const match = name.match(/([\d.,]+)\s*$/);
  return match ? match[1] : name;
}

// The one purchase engine every category (Pulsa, E-Money, Games, and
// whatever follows) shares: browse provider -> pick nominal -> confirm ->
// PIN -> result. The category name, its catalog (brands/products/markup),
// and — for categories that don't key off a phone number — the customer
// ID field's own label/placeholder/validation are the only things that
// differ per page. See catalog.service.ts's getCategoryPurchaseCatalog().
export function CategoryPurchaseFlow({
  categoryName,
  homeHref,
  brands,
  products,
  categoryMarkup,
  availableBalance,
  customerIdField = DEFAULT_CUSTOMER_ID_FIELD,
}: CategoryPurchaseFlowProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("browse");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [result, setResult] = useState<{ status: PurchaseResultStatus; note?: string } | null>(null);

  const normalizedCustomerId = customerId.replace(/\s+/g, "");
  const customerIdPattern = useMemo(() => new RegExp(customerIdField.pattern), [customerIdField.pattern]);
  const isCustomerIdValid = customerIdPattern.test(normalizedCustomerId);

  const brandProducts = useMemo(
    () => (selectedBrandId ? products.filter((product) => product.brand_id === selectedBrandId) : []),
    [products, selectedBrandId],
  );

  const selectedBrand = brands.find((brand) => brand.id === selectedBrandId) ?? null;
  const selectedProduct = brandProducts.find((product) => product.id === selectedProductId) ?? null;
  const sellingPrice = selectedProduct ? Number(selectedProduct.base_price) + Number(categoryMarkup) : 0;

  // A fresh purchase intent gets a fresh idempotency key; retrying a wrong
  // PIN for the *same* intent reuses it, so a flaky retry can never
  // double-charge (transaction.service.ts's executeTransaction treats a
  // repeat key as "already handled", not a new purchase).
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [selectedProductId]);

  function handleSelectBrand(brandId: string) {
    setSelectedBrandId(brandId);
    setSelectedProductId(null);
  }

  async function handleSubmitPin(pin: string) {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    setPinError(null);
    try {
      const { transaction } = await executePurchase({
        productId: selectedProduct.id,
        customerNumber: normalizedCustomerId,
        pin,
        idempotencyKey,
      });

      if (transaction.status === "SUCCESS") {
        setResult({ status: "SUCCESS" });
      } else if (transaction.status === "FAILED") {
        setResult({ status: "FAILED" });
      } else {
        setResult({ status: "PENDING" });
      }
      setPhase("result");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Transaksi gagal diproses. Coba lagi.";
      // The provider genuinely didn't respond — funds are held, not lost,
      // and retyping the PIN won't change that. Everything else (wrong
      // PIN, insufficient balance, PIN locked) is retry-able input error.
      if (message.includes("tertunda")) {
        setResult({ status: "PENDING", note: message });
        setPhase("result");
      } else {
        setPinError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (phase === "result" && result) {
    return (
      <PurchaseResultScreen
        status={result.status}
        categoryName={categoryName}
        note={result.note}
        brandName={selectedBrand?.name ?? ""}
        customerIdLabel={customerIdField.label}
        customerId={customerId}
        nominalLabel={
          selectedProduct ? extractNominalLabel(selectedProduct.product_name, categoryName, selectedBrand?.name) : ""
        }
        price={String(sellingPrice)}
        homeHref={homeHref}
      />
    );
  }

  if (phase === "pin") {
    return (
      <PurchasePinScreen
        onBack={() => setPhase("confirm")}
        onSubmit={handleSubmitPin}
        isSubmitting={isSubmitting}
        error={pinError}
      />
    );
  }

  if (phase === "confirm" && selectedBrand && selectedProduct) {
    return (
      <PurchaseConfirmationScreen
        categoryName={categoryName}
        brandName={selectedBrand.name}
        brandInitials={selectedBrand.name.slice(0, 2).toUpperCase()}
        customerIdLabel={customerIdField.label}
        customerId={customerId}
        nominalLabel={extractNominalLabel(selectedProduct.product_name, categoryName, selectedBrand.name)}
        price={sellingPrice}
        availableBalance={availableBalance}
        onBack={() => setPhase("browse")}
        onConfirm={() => setPhase("pin")}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
        <button
          type="button"
          onClick={() => (selectedBrandId ? setSelectedBrandId(null) : router.push(homeHref))}
          aria-label="Kembali"
          className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-semibold">{selectedBrand ? `${categoryName} - ${selectedBrand.name}` : categoryName}</h1>
      </header>

      <div className={cn("flex flex-1 flex-col gap-5 p-4", selectedProduct && "pb-32")}>
        <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{customerIdField.label}</p>
            {selectedBrandId ? (
              <p className="font-medium">{customerId}</p>
            ) : (
              <input
                type="text"
                inputMode="numeric"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                placeholder={customerIdField.placeholder}
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
            {!isCustomerIdValid && customerId.length > 0 ? (
              <p className="text-xs text-destructive">{customerIdField.invalidMessage}</p>
            ) : null}
            <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:gap-x-3">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  type="button"
                  disabled={!isCustomerIdValid}
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
            {!isCustomerIdValid ? (
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{customerIdField.helperMessage}</p>
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
                  {extractNominalLabel(product.product_name, categoryName, selectedBrand?.name)}
                </button>
              ))}
            </div>
            {brandProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada produk aktif untuk provider ini.</p>
            ) : null}

            <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Pastikan {customerIdField.label.toLowerCase()} dan provider sudah benar sebelum melanjutkan.
            </p>
          </div>
        )}
      </div>

      {selectedProduct ? (
        // bottom-16, not bottom-0 — the global MitraBottomNav (layout.tsx)
        // already occupies the bottom 4rem (h-16) of the viewport on every
        // page, so this bar stacks directly above it instead of overlapping.
        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto flex max-w-lg flex-col gap-3 border-t bg-background p-4">
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
            onClick={() => setPhase("confirm")}
            className="rounded-full bg-red-600 py-3 text-center font-semibold text-white"
          >
            Lanjutkan
          </button>
        </div>
      ) : null}
    </div>
  );
}
