"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Clipboard, ShieldCheck } from "lucide-react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/formatting/money";
import { getBrandLogo } from "@/lib/brand-logo";
import { cn } from "@/lib/utils";
import type { Brand, Product } from "@/types/product";
import { getTransactionBiometricOptions, listMyBiometricCredentials } from "@/features/mitra-account/services/biometric-api";
import { MERCHANDISING_LABELS, type MerchandisingFilter } from "../lib/merchandising-config";
import { MerchandisingTabs } from "./merchandising-tabs";
import { FeatureBadges, PromoBanner, PromoFooterCard } from "./promo-highlights";
import { PurchaseConfirmationScreen } from "./purchase-confirmation-screen";
import { PurchasePinScreen } from "./purchase-pin-screen";
import { PurchaseResultScreen, type PurchaseResultStatus } from "./purchase-result-screen";
import { executePurchase, getLiveProductPrice, getTransaction, verifyCustomerName } from "../services/purchase-api";

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
  /** product_id -> its effective markup (PRODUCT > BRAND > CATEGORY >
   *  GLOBAL) — see catalog.service.ts's getCategoryPurchaseCatalog(). Not
   *  one flat value per category: two products in the same category can
   *  have different markups if either has its own PRODUCT/BRAND override. */
  productMarkups: Record<string, string>;
  /** brand_id -> its "Cek Nama Pengguna" product_id, for the Verifikasi
   *  Pengguna card — see catalog.service.ts's getCategoryPurchaseCatalog.
   *  Omitted/empty means this category has no verification SKUs at all
   *  (every category except E-Money today), in which case the card never
   *  renders. */
  verificationProductByBrandId?: Record<string, string>;
  availableBalance: string;
  /** Override for categories whose customer_no isn't a phone number —
   *  Games needs a numeric player ID, optionally with a zone ID in
   *  parentheses (e.g. "123456789(1001)" for Mobile Legends). Omitted
   *  entirely defaults to phone-number validation. */
  customerIdField?: CustomerIdFieldConfig;
  /** e.g. "Prabayar" — shown as a badge on the Confirmation screen's
   *  product card. Only pass this when it's a verified fact about every
   *  product in the category (PLN's page.tsx passes it since the whole
   *  synced catalog is prepaid tokens); omit rather than guess. */
  productTypeLabel?: string;
  /** The Super Murah/Promo/Terlaris/Reguler tab row only makes sense for
   *  categories with genuine merchandising_tag variety across many SKUs
   *  per provider (Pulsa, Voucher, ...) — E-Money and PLN's catalogs are a
   *  handful of fixed nominal products with no such tiers, so the tabs
   *  have nothing real to filter. Defaults to shown; PLN/E-Money's
   *  page.tsx pass false. The hero PromoBanner above it stays either way
   *  (it's not tab-driven), just always showing its "Reguler" copy. */
  showMerchandisingTabs?: boolean;
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
  productMarkups,
  verificationProductByBrandId = {},
  availableBalance,
  customerIdField = DEFAULT_CUSTOMER_ID_FIELD,
  productTypeLabel,
  showMerchandisingTabs = true,
}: CategoryPurchaseFlowProps) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifiedTariffPower, setVerifiedTariffPower] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  // "REGULER" (no tag filter) is the neutral default — a mitra who never
  // touches the tabs and taps a provider straight away sees the normal,
  // unfiltered price list. Only tapping Super Murah/Promo/Terlaris narrows
  // the nominal list down to products carrying that merchandising_tag.
  const [merchandisingFilter, setMerchandisingFilter] = useState<MerchandisingFilter>("REGULER");
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("browse");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  // Only offered once the browser supports WebAuthn AND this account has
  // at least one active credential — checked lazily when the PIN screen
  // is actually reached, not on every page load.
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [result, setResult] = useState<{
    status: PurchaseResultStatus;
    transactionId?: string;
    providerTransactionId?: string | null;
    note?: string;
    timedOut?: boolean;
  } | null>(null);
  // Filled in only once a live, single-SKU Digiflazz check succeeds (see
  // handleProceedToConfirm) — null means "still showing the page-load
  // estimate," which is what the browse screen's bottom bar shows.
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);
  const [priceCheckError, setPriceCheckError] = useState<string | null>(null);

  const normalizedCustomerId = customerId.replace(/\s+/g, "");
  const customerIdPattern = useMemo(() => new RegExp(customerIdField.pattern), [customerIdField.pattern]);
  const isCustomerIdValid = customerIdPattern.test(normalizedCustomerId);

  const brandProducts = useMemo(() => {
    if (!selectedBrandId) return [];
    const forBrand = products.filter((product) => product.brand_id === selectedBrandId);
    if (merchandisingFilter === "REGULER") return forBrand;
    return forBrand.filter((product) => product.merchandising_tag === merchandisingFilter);
  }, [products, selectedBrandId, merchandisingFilter]);

  // Providers that have at least one product tagged with the active
  // MerchandisingTabs selection surface first — "REGULER" means no tag
  // filter at all. Falls back to the untouched brand list whenever nothing
  // is tagged yet (e.g. right after this feature ships, before Super Admin
  // has curated anything on the Produk page), so the grid never goes empty.
  const taggedBrandIds = useMemo(() => {
    if (merchandisingFilter === "REGULER") return null;
    const ids = new Set<string>();
    for (const product of products) {
      if (product.merchandising_tag === merchandisingFilter && product.brand_id) {
        ids.add(product.brand_id);
      }
    }
    return ids;
  }, [products, merchandisingFilter]);

  const filteredBrands = useMemo(() => {
    if (!taggedBrandIds || taggedBrandIds.size === 0) return brands;
    const matched = brands.filter((brand) => taggedBrandIds.has(brand.id));
    const rest = brands.filter((brand) => !taggedBrandIds.has(brand.id));
    return [...matched, ...rest];
  }, [brands, taggedBrandIds]);

  const featuredBrand = taggedBrandIds && taggedBrandIds.size > 0 ? (filteredBrands[0] ?? null) : null;

  const selectedBrand = brands.find((brand) => brand.id === selectedBrandId) ?? null;
  const selectedProduct = brandProducts.find((product) => product.id === selectedProductId) ?? null;
  const hasVerificationProducts = Object.keys(verificationProductByBrandId).length > 0;
  const verificationProductId = selectedBrandId ? verificationProductByBrandId[selectedBrandId] : undefined;
  // Estimate from the page-load snapshot — shown while still browsing.
  // Overridden by `livePrice` (a fresh single-SKU Digiflazz check) the
  // moment the mitra taps "Lanjutkan", per Digiflazz's own guidance to
  // re-check price right when a customer has picked a specific product.
  const estimatedSellingPrice = selectedProduct
    ? Number(selectedProduct.base_price) + Number(productMarkups[selectedProduct.id] ?? "0")
    : 0;
  const sellingPrice = livePrice ?? estimatedSellingPrice;

  // A fresh purchase intent gets a fresh idempotency key; retrying a wrong
  // PIN for the *same* intent reuses it, so a flaky retry can never
  // double-charge (transaction.service.ts's executeTransaction treats a
  // repeat key as "already handled", not a new purchase).
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [selectedProductId]);

  // Checked once, lazily, the moment the PIN screen is actually reached —
  // not on page load, and not re-checked on every render. A device with no
  // platform authenticator, or an account with zero registered
  // credentials, simply never sees the "Gunakan Biometrik" button.
  useEffect(() => {
    if (phase !== "pin" || !browserSupportsWebAuthn()) return;
    let cancelled = false;
    listMyBiometricCredentials()
      .then(({ credentials }) => {
        if (!cancelled) setBiometricAvailable(credentials.length > 0);
      })
      .catch(() => {
        if (!cancelled) setBiometricAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [phase]);

  function handleSelectBrand(brandId: string) {
    setSelectedBrandId(brandId);
    setSelectedProductId(null);
    setLivePrice(null);
    setPriceCheckError(null);
    setVerifiedName(null);
    setVerifiedTariffPower(null);
    setVerifyError(null);
  }

  function handleCustomerIdChange(value: string) {
    setCustomerId(value);
    // A different number needs re-verification — a name checked against
    // the old one would be actively misleading left on screen.
    setVerifiedName(null);
    setVerifiedTariffPower(null);
    setVerifyError(null);
  }

  async function handleVerifyName() {
    if (!verificationProductId) return;
    setIsVerifying(true);
    setVerifyError(null);
    try {
      const { registeredName, tariffPower } = await verifyCustomerName(verificationProductId, normalizedCustomerId);
      setVerifiedName(registeredName);
      setVerifiedTariffPower(tariffPower ?? null);
    } catch (error) {
      setVerifyError(error instanceof ApiError ? error.message : "Gagal memverifikasi nomor. Coba lagi.");
    } finally {
      setIsVerifying(false);
    }
  }

  function handleSelectProduct(productId: string) {
    setSelectedProductId(productId);
    setLivePrice(null);
    setPriceCheckError(null);
  }

  async function handlePasteCustomerId() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setCustomerId(text.trim());
    } catch {
      // Clipboard permission denied/unavailable — user can still type it in manually.
    }
  }

  // Digiflazz's own best-practice: check the specific product's price
  // right when the customer has chosen it, rather than trusting whatever
  // the page loaded with (which can be minutes stale). A failure here
  // (price-list unreachable, or the SKU just went unavailable) keeps the
  // mitra on the browse screen instead of letting them confirm a purchase
  // against a price nobody can guarantee anymore.
  async function handleProceedToConfirm() {
    if (!selectedProduct) return;
    setIsCheckingPrice(true);
    setPriceCheckError(null);
    try {
      const pricing = await getLiveProductPrice(selectedProduct.id);
      setLivePrice(Number(pricing.sellingPrice));
      setPhase("confirm");
    } catch (error) {
      setPriceCheckError(
        error instanceof ApiError ? error.message : "Gagal memeriksa harga terbaru. Coba lagi.",
      );
    } finally {
      setIsCheckingPrice(false);
    }
  }

  // Shared by both confirmation paths below — the PIN screen's keypad and
  // its "Gunakan Biometrik" button ultimately hit the exact same
  // executeTransaction() engine server-side, differing only in what proof
  // of confirmation they send.
  async function submitPurchase(auth: Parameters<typeof executePurchase>[0]["auth"]) {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    setPinError(null);
    try {
      const { transaction } = await executePurchase({
        productId: selectedProduct.id,
        customerNumber: normalizedCustomerId,
        idempotencyKey,
        auth,
      });

      if (transaction.status === "SUCCESS") {
        setResult({
          status: "SUCCESS",
          transactionId: transaction.id,
          providerTransactionId: transaction.provider_transaction_id,
        });
      } else if (transaction.status === "FAILED") {
        setResult({ status: "FAILED", transactionId: transaction.id });
      } else {
        // RESERVED (or anything else not-yet-final) — the bounded poll
        // below picks up from here once phase flips to "result".
        setResult({ status: "PENDING", transactionId: transaction.id });
      }
      setPhase("result");
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Transaksi gagal diproses. Coba lagi.";
      // The provider genuinely didn't respond — funds are held, not lost,
      // and retyping the PIN won't change that. Everything else (wrong
      // PIN, insufficient balance, PIN locked, biometric verification
      // failure) is retry-able input error. No transactionId here — the
      // execute call itself never returned a transaction to poll for, so
      // the mitra is pointed at Histori (see PurchaseResultScreen) instead.
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

  function handleSubmitPin(pin: string) {
    return submitPurchase({ method: "PIN", pin });
  }

  // Runs the full WebAuthn "get an assertion" ceremony (challenge from the
  // server, then the browser's own biometric prompt) before handing the
  // result to the same submitPurchase() the keypad uses. A cancelled/failed
  // prompt (startAuthentication throwing) surfaces as a normal retry-able
  // pinError — the mitra can just use the keypad instead.
  async function handleBiometricSubmit() {
    setIsSubmitting(true);
    setPinError(null);
    try {
      const optionsJSON = await getTransactionBiometricOptions();
      const assertion = await startAuthentication({ optionsJSON });
      await submitPurchase({ method: "BIOMETRIC", assertion });
    } catch (error) {
      setIsSubmitting(false);
      setPinError(error instanceof ApiError ? error.message : "Verifikasi biometrik gagal. Gunakan PIN.");
    }
  }

  // Bagian 2/3 of the PLN-token fix: the webhook (transaction.service.ts)
  // is the only thing that ever writes SUCCESS/FAILED — this effect only
  // *reads* /api/transactions/[id] (itself a pure PostgreSQL read, never
  // Digiflazz) to notice that write. Bounded: every 3s, capped at 20
  // attempts (~1 minute), stops immediately on SUCCESS/FAILED/REFUNDED/
  // not-found, and the cleanup function (return below) both cancels the
  // in-flight chain and clears the pending timer — so navigating away,
  // the phase changing, or the component unmounting all stop it, and a
  // re-render never starts a second overlapping chain (setTimeout
  // recursion only ever schedules its *own* next call, one at a time).
  useEffect(() => {
    if (phase !== "result" || result?.status !== "PENDING" || !result.transactionId) return;
    const transactionId = result.transactionId;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      if (cancelled) return;
      attempts += 1;
      try {
        const { transaction } = await getTransaction(transactionId);
        if (cancelled) return;
        if (transaction.status === "SUCCESS") {
          setResult({
            status: "SUCCESS",
            transactionId: transaction.id,
            providerTransactionId: transaction.provider_transaction_id,
          });
          return;
        }
        if (transaction.status === "FAILED" || transaction.status === "REFUNDED") {
          setResult({ status: "FAILED", transactionId: transaction.id });
          return;
        }
        // Still RESERVED — keep waiting, unless the attempt budget is spent.
        if (attempts >= 20) {
          setResult((prev) => (prev && prev.status === "PENDING" ? { ...prev, timedOut: true } : prev));
          return;
        }
        timer = setTimeout(poll, 3000);
      } catch {
        // Transaction genuinely not found, or a network hiccup — either
        // way, stop rather than keep hammering; Histori is the fallback.
      }
    }

    timer = setTimeout(poll, 3000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [phase, result?.status, result?.transactionId]);

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
        historiHref={homeHref.replace(/\/dashboard$/, "/histori")}
        providerTransactionId={result.providerTransactionId}
        timedOut={result.timedOut}
      />
    );
  }

  if (phase === "pin") {
    return (
      <PurchasePinScreen
        onBack={() => setPhase("confirm")}
        onSubmit={handleSubmitPin}
        onUseBiometric={biometricAvailable ? handleBiometricSubmit : undefined}
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
        productTypeLabel={productTypeLabel}
        customerIdLabel={customerIdField.label}
        customerId={customerId}
        verifiedName={verifiedName}
        verifiedTariffPower={verifiedTariffPower}
        nominalLabel={extractNominalLabel(selectedProduct.product_name, categoryName, selectedBrand.name)}
        price={sellingPrice}
        availableBalance={availableBalance}
        referenceId={idempotencyKey}
        onBack={() => {
          setLivePrice(null);
          setPhase("browse");
        }}
        onConfirm={() => setPhase("pin")}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* STANDING LAYOUT RULE for this shared purchase-flow screen — applies
          to every category that renders it (Pulsa, E-Money, PLN, Data,
          Games, Gas, TV, Voucher, Aktivasi Perdana/Voucher, Masa Aktif,
          Paket SMS & Telpon today, and any category added later, since
          they all render this one component rather than duplicating this
          screen per category): the back-button header, the customer-id
          row, and — while still browsing providers — the promo banner and
          merchandising tabs all stay sticky together at the top of the
          viewport; only the provider/nominal grid below scrolls. They're
          one combined sticky unit (not two separately-positioned sticky
          elements) specifically so there's no header-height offset to
          keep in sync if the header's own height ever changes — keep any
          future edit to this browse JSX inside this same
          sticky-header-block / plain-scrollable-block split, don't move
          pieces back into one flat scrolling block, or every category
          regresses at once.
            `position: sticky` (not fixed) keeps it in normal flow until
          scrolled to the top of the viewport, where it then stays put;
          the page's only scroll container is the window itself (no
          overflow-constrained ancestor — see BumdesLayout/KonterLayout),
          so `top-0` alone is enough. Opaque bg + z-20 (same layering as
          the Beranda wallet card's own sticky header) keeps the provider/
          nominal grid scrolling underneath it instead of showing through. */}
      <div className="sticky top-0 z-20 flex flex-col bg-background">
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

        <div className="flex flex-col gap-4 px-4 pt-4 pb-4">
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
                  onChange={(event) => handleCustomerIdChange(event.target.value)}
                  placeholder={customerIdField.placeholder}
                  className="w-full bg-transparent font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
                />
              )}
            </div>
            {selectedBrandId ? (
              <button type="button" onClick={() => setSelectedBrandId(null)} className="text-sm font-medium text-red-600">
                Ubah
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePasteCustomerId}
                aria-label="Tempel dari clipboard"
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted"
              >
                <Clipboard className="size-4" />
              </button>
            )}
          </div>

          {/* Always rendered once this category's catalog has at least
              one "Cek Nama" SKU (E-Money today) — regardless of browse-
              provider vs. browse-nominal step, same as the customer-id
              row above it, so a mitra can pick a provider in the grid
              below, scroll back up, and verify without losing their
              place. The button itself stays disabled until a provider
              with a verification SKU is selected — per product decision,
              verification is a pre-purchase double-check tied to an
              already-chosen provider, not a way to discover which
              provider a number belongs to. */}
          {hasVerificationProducts ? (
            <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50/60 p-3">
              <ShieldCheck className="size-8 shrink-0 text-red-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Verifikasi Pengguna</p>
                {verifiedName ? (
                  <p className="text-xs text-emerald-700">Terdaftar atas nama: {verifiedName}</p>
                ) : verifyError ? (
                  <p className="text-xs text-destructive">{verifyError}</p>
                ) : !selectedBrandId ? (
                  <p className="text-xs text-muted-foreground">Pilih provider terlebih dahulu untuk verifikasi.</p>
                ) : !verificationProductId ? (
                  <p className="text-xs text-muted-foreground">Verifikasi tidak tersedia untuk provider ini.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pastikan nomor tujuan sudah terdaftar atas akun e-money untuk menghindari kesalahan transaksi.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleVerifyName}
                disabled={!verificationProductId || isVerifying}
                className="shrink-0 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                {isVerifying ? "Memeriksa..." : verifiedName || verifyError ? "Cek Ulang" : "Verifikasi Pengguna"}
              </button>
            </div>
          ) : null}

          {!selectedBrandId ? (
            <>
              <PromoBanner filter={merchandisingFilter} brandName={featuredBrand?.name ?? null} />
              {showMerchandisingTabs ? (
                <MerchandisingTabs value={merchandisingFilter} onChange={setMerchandisingFilter} />
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {/* Everything below scrolls normally underneath the sticky block above. */}
      <div className={cn("flex flex-1 flex-col", selectedProduct && "pb-32")}>
        <div className="flex flex-col gap-5 px-4 pb-4">
          {!selectedBrandId ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <p className="font-semibold">Pilih Provider</p>
                {!isCustomerIdValid && customerId.length > 0 ? (
                  <p className="text-xs text-destructive">{customerIdField.invalidMessage}</p>
                ) : null}
                <div className="grid grid-cols-4 gap-x-2 gap-y-3 sm:gap-x-3">
                  {filteredBrands.map((brand) => {
                    const logo = getBrandLogo(brand.name);
                    return (
                      <button
                        key={brand.id}
                        type="button"
                        disabled={!isCustomerIdValid}
                        onClick={() => handleSelectBrand(brand.id)}
                        className={cn(
                          "flex h-24 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-center disabled:opacity-40",
                          featuredBrand?.id === brand.id && "border-red-500 bg-red-50",
                        )}
                      >
                        {logo ? (
                          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border">
                            <Image src={logo} alt="" width={40} height={40} className="size-full object-cover" />
                          </span>
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-600">
                            {brand.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="line-clamp-2 w-full break-words text-[11px] leading-tight font-medium">
                          {brand.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!isCustomerIdValid ? (
                  <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{customerIdField.helperMessage}</p>
                ) : null}
              </div>

              <FeatureBadges />
              <PromoFooterCard filter={merchandisingFilter} categoryName={categoryName} brandName={featuredBrand?.name ?? null} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <p className="font-semibold">Pilih Nominal</p>
                {merchandisingFilter !== "REGULER" ? (
                  <p className="text-xs text-muted-foreground">
                    Menampilkan produk {MERCHANDISING_LABELS[merchandisingFilter]}
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {brandProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product.id)}
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
                <p className="text-sm text-muted-foreground">
                  {merchandisingFilter === "REGULER"
                    ? "Belum ada produk aktif untuk provider ini."
                    : `Belum ada produk ${MERCHANDISING_LABELS[merchandisingFilter]} untuk provider ini.`}
                </p>
              ) : null}

              <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                Pastikan {customerIdField.label.toLowerCase()} dan provider sudah benar sebelum melanjutkan.
              </p>
            </div>
          )}
        </div>
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
          {priceCheckError ? <p className="text-xs text-destructive">{priceCheckError}</p> : null}
          <button
            type="button"
            onClick={handleProceedToConfirm}
            disabled={isCheckingPrice}
            className="rounded-full bg-red-600 py-3 text-center font-semibold text-white disabled:opacity-60"
          >
            {isCheckingPrice ? "Memeriksa harga..." : "Lanjutkan"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
