import {
  fetchDigiflazzPriceList,
  type DigiflazzPascaPriceListItem,
  type DigiflazzPrepaidPriceListItem,
} from "@/lib/digiflazz/price-list";
import { getActiveDigiflazzCredentials } from "@/services/digiflazz.service";
import {
  disableProductsMissingFromSync,
  finishCatalogSyncLog,
  getLastCatalogSyncStartedAt,
  startCatalogSyncLog,
  upsertBrand,
  upsertCategory,
  upsertProduct,
} from "@/repositories/product.repository";
import type { ProductStatus } from "@/types/product";

// Katalog prabayar (pulsa, data, token, voucher). Pascabayar punya bentuk
// harga yang sama sekali berbeda — biaya admin + komisi, tanpa harga tetap —
// dan disinkronkan terpisah oleh runPascaCatalogSync di bawah (migrasi 057,
// PRD Pascabayar §7.11).
const CMD = "prepaid" as const;

// Digiflazz's own best-practice guidance: "Update harga all produk dapat
// dilakukan setiap 5 menit 1x." This is specifically about the *full*
// price-list pull this job does — a single buyer_sku_code lookup right
// before one purchase (pricing.service.ts's getLiveProductPricing) is a
// separate, much narrower call they recommend doing on every transaction
// instead, and is not subject to this cooldown.
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;

function mapDigiflazzStatus(item: DigiflazzPrepaidPriceListItem): ProductStatus {
  if (!item.buyer_product_status) return "DISABLED";
  if (!item.seller_product_status) return "GANGGUAN";
  return "ACTIVE";
}

export interface CatalogSyncSummary {
  received: number;
  inserted: number;
  updated: number;
  disabled: number;
  errors: number;
}

// Pulls the full prepaid price-list from Digiflazz and mirrors it into the
// local products/categories/brands tables — the app always reads from
// here, never Digiflazz directly, per their own rate-limit guidance
// ("simpan daftar harga pada database milik Anda").
export async function runCatalogSync(): Promise<CatalogSyncSummary> {
  const credentials = await getActiveDigiflazzCredentials();
  if (!credentials) {
    throw new Error("Kredensial Digiflazz belum diatur atau tidak aktif.");
  }

  const lastStartedAt = await getLastCatalogSyncStartedAt();
  if (lastStartedAt) {
    const elapsedMs = Date.now() - lastStartedAt.getTime();
    if (elapsedMs < MIN_SYNC_INTERVAL_MS) {
      const waitSeconds = Math.ceil((MIN_SYNC_INTERVAL_MS - elapsedMs) / 1000);
      throw new Error(
        `Digiflazz membatasi sinkronisasi daftar harga maksimal setiap 5 menit sekali. Coba lagi dalam ${waitSeconds} detik.`,
      );
    }
  }

  const log = await startCatalogSyncLog();

  const summary: CatalogSyncSummary = { received: 0, inserted: 0, updated: 0, disabled: 0, errors: 0 };
  const errorDetails: Array<{ sku: string; message: string }> = [];

  try {
    const items = await fetchDigiflazzPriceList<DigiflazzPrepaidPriceListItem>({
      baseUrl: credentials.baseUrl,
      username: credentials.username,
      apiKey: credentials.apiKey,
      cmd: CMD,
    });

    summary.received = items.length;

    // Cache category/brand ids per name within this run so 1000+ products
    // don't each trigger their own upsert round-trip for the same handful
    // of categories/brands.
    const categoryIds = new Map<string, string>();
    const brandIds = new Map<string, string>();

    for (const item of items) {
      try {
        if (!categoryIds.has(item.category)) {
          const category = await upsertCategory(item.category, "PREPAID");
          categoryIds.set(item.category, category.id);
        }
        if (!brandIds.has(item.brand)) {
          const brand = await upsertBrand(item.brand, "PREPAID");
          brandIds.set(item.brand, brand.id);
        }

        const status = mapDigiflazzStatus(item);
        const product = await upsertProduct({
          sku: item.buyer_sku_code,
          product_name: item.product_name,
          category_id: categoryIds.get(item.category) ?? null,
          brand_id: brandIds.get(item.brand) ?? null,
          product_type: "PREPAID",
          base_price: item.price,
          status,
          provider_type: item.type,
        });

        if (status === "DISABLED") {
          summary.disabled += 1;
        }
        // upsertProduct always does INSERT ... ON CONFLICT UPDATE, so we
        // can't cheaply tell "was this an insert or update" from its
        // result alone without an extra query — approximate via
        // created_at === updated_at on first sync.
        if (product.created_at.getTime() === product.updated_at.getTime()) {
          summary.inserted += 1;
        } else {
          summary.updated += 1;
        }
      } catch (error) {
        summary.errors += 1;
        errorDetails.push({
          sku: item.buyer_sku_code,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    await finishCatalogSyncLog(log.id, {
      received_count: summary.received,
      inserted_count: summary.inserted,
      updated_count: summary.updated,
      disabled_count: summary.disabled,
      error_count: summary.errors,
      errors: errorDetails.length > 0 ? errorDetails : undefined,
    });

    return summary;
  } catch (error) {
    await finishCatalogSyncLog(log.id, {
      received_count: summary.received,
      inserted_count: summary.inserted,
      updated_count: summary.updated,
      disabled_count: summary.disabled,
      error_count: summary.errors + 1,
      errors: [{ sku: "-", message: error instanceof Error ? error.message : "Unknown error" }],
    });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Pascabayar (PRD Pascabayar §7.11)
// ---------------------------------------------------------------------------

function mapPascaStatus(item: DigiflazzPascaPriceListItem): ProductStatus {
  if (!item.buyer_product_status) return "DISABLED";
  if (!item.seller_product_status) return "GANGGUAN";
  return "ACTIVE";
}

export interface PascaCatalogSyncSummary extends CatalogSyncSummary {
  /** Produk pascabayar yang hilang dari price-list terbaru, dan karena itu
   *  dinonaktifkan. Sudah ikut terhitung di `disabled`. */
  missing: number;
}

// Cermin lokal katalog pascabayar. Berbeda dari prabayar dalam tiga hal:
//   1. Tidak ada harga. `base_price` selalu 0; yang disimpan adalah biaya
//      admin dan komisi. Nominal tagihan baru diketahui saat cek tagihan.
//   2. Kategori dan brand dibuat sebagai POSTPAID, sehingga tidak pernah
//      bercampur dengan katalog prabayar walau namanya kelak sama.
//   3. Produk yang hilang dari daftar dinonaktifkan — produk hantu yang
//      tertinggal tetap bisa dicek tagihannya oleh mitra.
export async function runPascaCatalogSync(): Promise<PascaCatalogSyncSummary> {
  const credentials = await getActiveDigiflazzCredentials();
  if (!credentials) {
    throw new Error("Kredensial Digiflazz belum diatur atau tidak aktif.");
  }

  // Batas 5 menit Digiflazz berlaku per AKUN, bukan per jenis daftar harga,
  // jadi jendela tunggunya sengaja dibagi dengan sinkron prabayar.
  const lastStartedAt = await getLastCatalogSyncStartedAt();
  if (lastStartedAt) {
    const elapsedMs = Date.now() - lastStartedAt.getTime();
    if (elapsedMs < MIN_SYNC_INTERVAL_MS) {
      const waitSeconds = Math.ceil((MIN_SYNC_INTERVAL_MS - elapsedMs) / 1000);
      throw new Error(
        `Digiflazz membatasi sinkronisasi daftar harga maksimal setiap 5 menit sekali. Coba lagi dalam ${waitSeconds} detik.`,
      );
    }
  }

  const log = await startCatalogSyncLog();
  const summary: PascaCatalogSyncSummary = {
    received: 0,
    inserted: 0,
    updated: 0,
    disabled: 0,
    errors: 0,
    missing: 0,
  };
  const errorDetails: Array<{ sku: string; message: string }> = [];

  try {
    const items = await fetchDigiflazzPriceList<DigiflazzPascaPriceListItem>({
      baseUrl: credentials.baseUrl,
      username: credentials.username,
      apiKey: credentials.apiKey,
      cmd: "pasca",
    });

    summary.received = items.length;

    const categoryIds = new Map<string, string>();
    const brandIds = new Map<string, string>();
    const skuDiterima: string[] = [];

    for (const item of items) {
      try {
        if (!categoryIds.has(item.category)) {
          const category = await upsertCategory(item.category, "POSTPAID");
          categoryIds.set(item.category, category.id);
        }
        if (!brandIds.has(item.brand)) {
          const brand = await upsertBrand(item.brand, "POSTPAID");
          brandIds.set(item.brand, brand.id);
        }

        const status = mapPascaStatus(item);
        const product = await upsertProduct({
          sku: item.buyer_sku_code,
          product_name: item.product_name,
          category_id: categoryIds.get(item.category) ?? null,
          brand_id: brandIds.get(item.brand) ?? null,
          product_type: "POSTPAID",
          base_price: 0,
          status,
          admin_fee: item.admin,
          provider_commission: item.commission,
        });
        skuDiterima.push(item.buyer_sku_code);

        if (status === "DISABLED") {
          summary.disabled += 1;
        }
        if (product.created_at.getTime() === product.updated_at.getTime()) {
          summary.inserted += 1;
        } else {
          summary.updated += 1;
        }
      } catch (error) {
        summary.errors += 1;
        errorDetails.push({
          sku: item.buyer_sku_code,
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Hanya dijalankan kalau daftarnya memang berisi: daftar kosong hampir
    // selalu berarti panggilannya yang bermasalah, bukan Digiflazz benar-benar
    // menutup semua produk pascabayar sekaligus.
    if (skuDiterima.length > 0) {
      summary.missing = await disableProductsMissingFromSync("POSTPAID", skuDiterima);
      summary.disabled += summary.missing;
    }

    await finishCatalogSyncLog(log.id, {
      received_count: summary.received,
      inserted_count: summary.inserted,
      updated_count: summary.updated,
      disabled_count: summary.disabled,
      error_count: summary.errors,
      errors: errorDetails.length > 0 ? errorDetails : undefined,
    });

    return summary;
  } catch (error) {
    await finishCatalogSyncLog(log.id, {
      received_count: summary.received,
      inserted_count: summary.inserted,
      updated_count: summary.updated,
      disabled_count: summary.disabled,
      error_count: summary.errors + 1,
      errors: [{ sku: "-", message: error instanceof Error ? error.message : "Unknown error" }],
    });
    throw error;
  }
}
