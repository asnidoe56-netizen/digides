import { withTransaction } from "@/lib/db/transaction";
import { recordAuditLog } from "@/repositories/audit.repository";
import {
  createCashbackLedgerEntry,
  createCashbackRule,
  findCashbackByTransaction,
  findCashbackRuleById,
  listActiveCashbackRules,
  listCashbackRules,
  sumCashbackPaid,
  updateCashbackRule,
  type CreateCashbackRuleInput,
  type UpdateCashbackRuleInput,
} from "@/repositories/cashback.repository";
import { listActiveCommissionRules, sumCommissionForTransaction } from "@/repositories/commission.repository";
import { findProductById } from "@/repositories/product.repository";
import { findTransactionById } from "@/repositories/transaction.repository";
import { getEffectiveMarkupValue } from "@/services/pricing.service";
import { getOwningUserId, postLedgerEntry } from "@/repositories/wallet.repository";
import type { CashbackCalculation, CashbackLedgerEntry, CashbackRule } from "@/types/cashback";

// Mesin Cashback (PRD Cashback).
//
// Dipanggil SESUDAH transaksi berstatus SUCCESS, di luar withTransaction()
// yang menahan saldo — persis di sebelah awardCommissionForTransaction yang
// sudah lama berjalan. Tidak menyentuh captureTransaction/releaseTransaction,
// tidak membuat state machine baru, tidak menyentuh selling_price.
//
// Itulah kenapa fitur ini tidak perlu mengamandemen
// FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md sama sekali (PRD §6.1). Kalau
// suatu perubahan cashback nanti menuntut menyentuh captureTransaction,
// perubahan itu yang salah — bukan dokumennya.

/** PRODUK mengalahkan BRAND, BRAND mengalahkan KATEGORI, KATEGORI
 *  mengalahkan GLOBAL. Aturan yang lebih spesifik selalu menang, karena
 *  itulah yang dimaksud admin ketika ia repot-repot menyebut satu produk. */
const SCOPE_RANK: Record<CashbackRule["scope_type"], number> = {
  PRODUCT: 4,
  BRAND: 3,
  CATEGORY: 2,
  GLOBAL: 1,
};

export function pickCashbackRule(
  rules: CashbackRule[],
  product: { id: string; category_id: string | null; brand_id: string | null } | null,
): CashbackRule | null {
  const matching = rules.filter((rule) => {
    switch (rule.scope_type) {
      case "GLOBAL":
        return true;
      case "PRODUCT":
        return product != null && rule.product_id === product.id;
      case "BRAND":
        return product != null && rule.brand_id != null && rule.brand_id === product.brand_id;
      case "CATEGORY":
        return product != null && rule.category_id != null && rule.category_id === product.category_id;
    }
  });

  if (matching.length === 0) return null;

  // Spesifisitas dulu, baru priority. Priority hanya memutuskan di antara
  // aturan yang sama-sama spesifik — dua aturan PRODUK untuk produk yang
  // sama, misalnya aturan promo yang sengaja ditumpangkan.
  matching.sort((a, b) => {
    const byScope = SCOPE_RANK[b.scope_type] - SCOPE_RANK[a.scope_type];
    if (byScope !== 0) return byScope;
    const byPriority = b.priority - a.priority;
    if (byPriority !== 0) return byPriority;
    return b.created_at.getTime() - a.created_at.getTime();
  });

  return matching[0];
}

/** Angka yang dipakai dua tempat: mesin yang benar-benar membayar, dan
 *  panel admin yang menunjukkan berapa yang AKAN terbayar. Satu fungsi
 *  supaya keduanya tidak pernah berbeda jawaban. */
export function calculateCashback(input: {
  rule: CashbackRule;
  sellingPrice: number;
  basePrice: number;
  commissionAlreadyAwarded: number;
}): CashbackCalculation {
  const { rule, sellingPrice, basePrice, commissionAlreadyAwarded } = input;

  const margin = Math.max(sellingPrice - basePrice, 0);
  const remainingMargin = Math.max(margin - commissionAlreadyAwarded, 0);

  // PERCENTAGE dihitung dari MARGIN, bukan harga jual (PRD §6.3). 10% dari
  // harga jual Rp5.510 adalah Rp551 — lebih besar dari seluruh marginnya
  // Rp500, jadi setiap transaksi akan rugi. Mesin komisi sudah memakai
  // dasar yang sama, dan konsistensinya penting: dua fitur yang menghitung
  // persen dari dasar berbeda akan tertukar oleh siapa pun yang mengatur
  // keduanya.
  const requested = Math.round(
    rule.cashback_type === "NOMINAL"
      ? Number(rule.cashback_value)
      : (margin * Number(rule.cashback_value)) / 100,
  );

  // 0 berarti "tidak ada batas", bukan "batasnya nol". Perbedaan ini pernah
  // jadi bug nyata di mesin komisi — `if (rule.max)` memperlakukan 0
  // tersimpan sebagai batas sungguhan dan diam-diam menolkan semuanya.
  const maxCashback = Number(rule.max_cashback ?? 0);

  let payable = requested;
  let cappedBy: CashbackCalculation["cappedBy"] = "NONE";

  if (maxCashback > 0 && payable > maxCashback) {
    payable = maxCashback;
    cappedBy = "MAX_CASHBACK";
  }

  // Pembatas terakhir, dan yang paling penting (PRD §6.2). Tanpa ini,
  // cashback Rp300 di atas komisi Rp300 pada margin Rp500 berarti Digides
  // rugi Rp100 setiap transaksi — dan ruginya tidak terlihat di mana pun
  // sampai ada yang menjumlahkan sebulan kemudian.
  if (payable > remainingMargin) {
    payable = remainingMargin;
    cappedBy = "REMAINING_MARGIN";
  }

  return {
    requested,
    margin,
    commission: commissionAlreadyAwarded,
    payable: Math.max(payable, 0),
    cappedBy,
  };
}

// Titik masuk dari transaction.service.ts, tepat di sebelah komisi.
//
// Mengembalikan null kalau tidak ada cashback yang dibayar — itu keadaan
// biasa (tidak ada aturan yang cocok, margin sudah habis, transaksi di
// bawah minimum), bukan kegagalan. Tidak pernah menulis baris Rp0.
export async function awardCashbackForTransaction(
  transactionId: string,
  actorUserId: string | null = null,
): Promise<CashbackLedgerEntry | null> {
  const transaction = await findTransactionById(transactionId);
  if (!transaction) {
    throw new Error("Transaksi tidak ditemukan");
  }
  if (transaction.status !== "SUCCESS") {
    throw new Error("Cashback hanya diberikan untuk transaksi berstatus SUCCESS");
  }

  const beneficiaryUserId = await getOwningUserId(transaction.wallet_id);
  if (!beneficiaryUserId) {
    // getOwningUserId sudah menyelesaikan dompet BUMDes ke admin_user_id
    // dan dompet Konter ke operator_user_id, jadi keduanya TETAP menerima
    // cashback — memang merekalah mitra yang berjualan. Yang jatuh ke sini
    // hanyalah dompet tanpa penanggung jawab perorangan sama sekali, yaitu
    // dompet toko. Dan itu benar: sejak amandemen §5d dokumen terkunci,
    // dompet toko tidak pernah membeli produk Digides.
    //
    // Cashbacknya masuk ke dompet yang MEMBAYAR (transaction.wallet_id),
    // sementara beneficiary_user_id mencatat siapa orang yang bertanggung
    // jawab atasnya — dua hal berbeda yang sengaja tidak disatukan.
    return null;
  }

  const rules = await listActiveCashbackRules();
  if (rules.length === 0) return null;

  const product = transaction.product_id ? await findProductById(transaction.product_id) : null;
  const rule = pickCashbackRule(
    rules,
    product ? { id: product.id, category_id: product.category_id, brand_id: product.brand_id } : null,
  );
  if (!rule) return null;

  const sellingPrice = Number(transaction.selling_price);

  const minTransaction = Number(rule.min_transaction ?? 0);
  if (minTransaction > 0 && sellingPrice < minTransaction) {
    return null;
  }

  // Dibaca SESUDAH komisi selesai dijalankan — urutan pemanggilan di
  // transaction.service.ts disengaja. Komisi adalah janji kepada upline
  // yang sudah berjalan lebih dulu dan tidak boleh dikurangi fitur baru.
  const commissionAlreadyAwarded = await sumCommissionForTransaction(transactionId);

  // base_price selalu mencerminkan SKU yang BENAR-BENAR memenuhi
  // pembelian — mekanisme SKU cadangan otomatis (dokumen terkunci §5a)
  // bisa menyelesaikannya dengan produk lain yang lebih mahal sementara
  // selling_price tetap beku. Jadi pada transaksi yang marginnya menipis
  // karena SKU cadangan, cashbacknya ikut mengecil dengan sendirinya
  // (PRD §6.7).
  const calculation = calculateCashback({
    rule,
    sellingPrice,
    basePrice: Number(transaction.base_price),
    commissionAlreadyAwarded,
  });

  if (calculation.payable <= 0) {
    return null;
  }

  return withTransaction(async (client) => {
    // Klaim dulu, bayar kemudian. Baris cashback_ledger dengan
    // transaction_id UNIQUE adalah yang benar-benar mencegah pembayaran
    // ganda — bukan pemeriksaan di kode, dan bukan disiplin pemanggilnya.
    const { entry, alreadyExisted } = await createCashbackLedgerEntry(
      {
        transaction_id: transaction.id,
        beneficiary_user_id: beneficiaryUserId,
        wallet_id: transaction.wallet_id,
        cashback_rule_id: rule.id,
        amount: calculation.payable,
      },
      client,
    );

    if (alreadyExisted || !entry) {
      // Transaksi ini sudah pernah dapat cashback. Berhenti di sini TANPA
      // menulis wallet_ledger — di titik inilah pembayaran kedua benar-
      // benar dicegah.
      return null;
    }

    await postLedgerEntry(client, {
      walletId: transaction.wallet_id,
      type: "CASHBACK",
      amount: calculation.payable,
      channel: "SYSTEM",
      transactionId: transaction.id,
      reference: entry.id,
      createdBy: actorUserId,
    });

    return entry;
  });
}

// --- panel admin ---------------------------------------------------------

export async function getCashbackRules(): Promise<CashbackRule[]> {
  return listCashbackRules();
}

export async function getCashbackRule(id: string): Promise<CashbackRule | null> {
  return findCashbackRuleById(id);
}

export async function saveCashbackRule(
  input: CreateCashbackRuleInput,
  actorUserId: string,
): Promise<CashbackRule> {
  if (input.cashback_value < 0) {
    throw new Error("Nilai cashback tidak boleh negatif");
  }
  if (input.cashback_type === "PERCENTAGE" && input.cashback_value > 100) {
    // Persen di atas 100 berarti cashback melebihi seluruh margin, yang
    // artinya rugi pada setiap transaksi. Pembatas sisa margin nanti akan
    // menahannya, tapi menerima angkanya di sini berarti admin mengira
    // aturannya berlaku padahal tidak pernah terbayar penuh.
    throw new Error("Persentase cashback tidak boleh lebih dari 100% dari margin");
  }

  const rule = await createCashbackRule(input);

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "CASHBACK_RULE_CREATED",
    entity: "cashback_rules",
    entity_id: rule.id,
    new_value: {
      scope_type: rule.scope_type,
      cashback_type: rule.cashback_type,
      cashback_value: rule.cashback_value,
    },
  });

  return rule;
}

export async function changeCashbackRule(
  id: string,
  input: UpdateCashbackRuleInput,
  actorUserId: string,
): Promise<CashbackRule> {
  const existing = await findCashbackRuleById(id);
  if (!existing) {
    throw new Error("Aturan cashback tidak ditemukan");
  }

  const updated = await updateCashbackRule(id, input);
  if (!updated) {
    throw new Error("Gagal memperbarui aturan cashback");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "CASHBACK_RULE_UPDATED",
    entity: "cashback_rules",
    entity_id: id,
    old_value: {
      cashback_type: existing.cashback_type,
      cashback_value: existing.cashback_value,
      is_active: existing.is_active,
    },
    new_value: {
      cashback_type: updated.cashback_type,
      cashback_value: updated.cashback_value,
      is_active: updated.is_active,
    },
  });

  return updated;
}

export async function getCashbackTotals(range: { from?: Date; to?: Date } = {}) {
  const totals = await sumCashbackPaid(range);
  return {
    totalAmount: Number(totals.total_amount),
    entryCount: Number(totals.entry_count),
  };
}

export async function getCashbackForTransaction(transactionId: string) {
  return findCashbackByTransaction(transactionId);
}

export interface CashbackPreview {
  productName: string;
  sellingPrice: number;
  basePrice: number;
  margin: number;
  /** Komisi TERBESAR yang mungkin terpakai pada produk ini — bukan yang
   *  rata-rata. Panel admin harus memperingatkan berdasarkan kasus
   *  terburuk, karena kasus terburuklah yang menghasilkan kerugian. */
  worstCaseCommission: number;
  calculation: CashbackCalculation;
}

// Yang membuat peringatan §6.2 bisa hidup saat admin mengetik: berapa yang
// AKAN benar-benar terbayar, bukan berapa yang diketik.
//
// Memakai calculateCashback yang sama persis dengan mesin yang membayar —
// satu fungsi, supaya panel dan kenyataan tidak pernah berbeda jawaban.
export async function previewCashback(input: {
  productId: string;
  cashbackType: CashbackRule["cashback_type"];
  cashbackValue: number;
  maxCashback?: number | null;
}): Promise<CashbackPreview> {
  const product = await findProductById(input.productId);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  // Sengaja TIDAK memakai getLiveProductPricing.
  //
  // Fungsi itu memanggil Digiflazz untuk satu SKU, dan itu benar pada saat
  // membeli — Digiflazz sendiri menganjurkannya. Tapi di sini admin sedang
  // mengetik angka di sebuah formulir: memanggil Digiflazz pada setiap
  // ketukan berarti peringatan yang seharusnya hidup justru menunggu
  // jaringan, dan gagal total kalau Digiflazz sedang tidak menjawab.
  // (Terlihat langsung saat pengujian: preview yang sama kadang 200 kadang
  // 400, tergantung Digiflazz.)
  //
  // Angka tersimpan sudah cukup untuk sebuah perkiraan, dan memang itulah
  // yang dilihat mitra di katalog. Yang benar-benar dibayar nanti tetap
  // dihitung dari base_price transaksi yang sesungguhnya.
  const markupValue = Number(
    await getEffectiveMarkupValue({
      id: product.id,
      category_id: product.category_id,
      brand_id: product.brand_id,
      product_type: product.product_type,
    }),
  );
  const basePrice = Number(product.base_price);
  const sellingPrice = basePrice + markupValue;

  const commissionRules = await listActiveCommissionRules();
  const margin = Math.max(sellingPrice - basePrice, 0);

  // Komisi terbesar yang bisa terpakai pada produk ini, dari aturan mana
  // pun yang cocok kategorinya. Mesin komisi sendiri membatasi pembayaran
  // pada margin, jadi angka ini juga dibatasi begitu.
  const worstCaseCommission = commissionRules
    .filter((rule) => rule.eligible_category_id === null || rule.eligible_category_id === product.category_id)
    .reduce((largest, rule) => {
      const amount =
        rule.commission_type === "FLAT"
          ? Number(rule.flat_amount ?? 0)
          : (margin * Number(rule.percentage ?? 0)) / 100;
      const capped = Number(rule.max_commission ?? 0) > 0
        ? Math.min(amount, Number(rule.max_commission))
        : amount;
      return Math.max(largest, Math.min(capped, margin));
    }, 0);

  const calculation = calculateCashback({
    rule: {
      cashback_type: input.cashbackType,
      cashback_value: String(input.cashbackValue),
      max_cashback: input.maxCashback == null ? null : String(input.maxCashback),
    } as CashbackRule,
    sellingPrice,
    basePrice,
    commissionAlreadyAwarded: Math.round(worstCaseCommission),
  });

  return {
    productName: product.product_name,
    sellingPrice,
    basePrice,
    margin,
    worstCaseCommission: Math.round(worstCaseCommission),
    calculation,
  };
}

// --- katalog mitra (PRD Cashback §6.5) -----------------------------------

// Perkiraan cashback per produk, untuk lencana di katalog — SEBELUM
// membeli. Cashback yang hanya muncul setelah transaksi adalah kejutan
// sekali lalu tidak mengubah apa-apa; yang membuatnya bekerja adalah mitra
// MEMILIH produk karena ada cashbacknya.
//
// Sengaja KONSERVATIF: dihitung dengan komisi TERBESAR yang mungkin
// terpakai, bukan komisi rata-rata. Komisi sebenarnya bergantung pada tier
// upline masing-masing mitra, yang tidak diketahui di sini. Lencana yang
// menjanjikan Rp200 lalu membayar Rp50 terasa seperti tipuan (§6.7);
// lencana yang menjanjikan Rp50 lalu membayar Rp200 terasa seperti bonus.
// Jadi lencana tidak pernah menjanjikan lebih dari yang pasti terbayar.
//
// Satu kali baca aturan untuk seluruh katalog, bukan per produk — katalog
// memuat sampai 200 produk, dan 200 kueri untuk menggambar satu halaman
// adalah cara membuat katalog terasa lambat justru di warung bersinyal
// lemah.
export async function estimateCashbackForProducts(
  products: Array<{ id: string; category_id: string | null; brand_id: string | null; base_price: string | number }>,
  markups: Record<string, string>,
): Promise<Record<string, number>> {
  const [cashbackRules, commissionRules] = await Promise.all([
    listActiveCashbackRules(),
    listActiveCommissionRules(),
  ]);
  if (cashbackRules.length === 0) return {};

  const estimates: Record<string, number> = {};
  for (const product of products) {
    const rule = pickCashbackRule(cashbackRules, product);
    if (!rule) continue;

    const basePrice = Number(product.base_price);
    const sellingPrice = basePrice + Number(markups[product.id] ?? 0);
    const minTransaction = Number(rule.min_transaction ?? 0);
    if (minTransaction > 0 && sellingPrice < minTransaction) continue;

    const margin = Math.max(sellingPrice - basePrice, 0);
    const worstCaseCommission = commissionRules
      .filter((commission) => commission.eligible_category_id === null || commission.eligible_category_id === product.category_id)
      .reduce((largest, commission) => {
        const amount =
          commission.commission_type === "FLAT"
            ? Number(commission.flat_amount ?? 0)
            : (margin * Number(commission.percentage ?? 0)) / 100;
        const capped = Number(commission.max_commission ?? 0) > 0 ? Math.min(amount, Number(commission.max_commission)) : amount;
        return Math.max(largest, Math.min(capped, margin));
      }, 0);

    const { payable } = calculateCashback({
      rule,
      sellingPrice,
      basePrice,
      commissionAlreadyAwarded: Math.round(worstCaseCommission),
    });
    if (payable > 0) estimates[product.id] = payable;
  }
  return estimates;
}
