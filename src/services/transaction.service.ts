import { randomUUID } from "crypto";
import { withTransaction } from "@/lib/db/transaction";
import { getActiveDigiflazzCredentials, getDigiflazzWebhookSecret } from "@/services/digiflazz.service";
import { submitDigiflazzTransaction, type DigiflazzTransactionResult } from "@/lib/digiflazz/transaction";
import { verifyDigiflazzWebhookSignature } from "@/lib/digiflazz/webhook";
import { verifyTransactionPin } from "@/services/auth.service";
import { verifyTransactionBiometric } from "@/services/biometric.service";
import { verifyMobileBiometricTransaction, type MobileBiometricAssertion } from "@/services/mobile-biometric.service";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { awardCashbackForTransaction } from "@/services/cashback.service";
import { awardCommissionForTransaction } from "@/services/commission.service";
import {
  findBackupProductCandidates,
  findBrandById,
  findCategoryById,
  findProductById,
} from "@/repositories/product.repository";
import { getLiveProductPricing } from "@/services/pricing.service";
import { getTransactionBalanceSummary, postLedgerEntry } from "@/repositories/wallet.repository";
import {
  createTransaction,
  findTransactionById,
  findTransactionByIdempotencyKey,
  listTransactionEvents,
  listTransactionsWithDetail,
  countTransactionsWithDetail,
  findTransactionWithDetailById,
  getProviderContactTiming,
  lockTransactionForUpdate,
  recordTransactionEvent,
  sumReservedTransactions,
  sumTransactionProfit,
  swapTransactionProductForBackup,
  transitionTransactionStatus,
  updateTransactionBasePrice,
  type ListTransactionsFilter,
} from "@/repositories/transaction.repository";
// Jalur pascabayar (§5f). Berdampingan dengan submitDigiflazzTransaction,
// bukan menjadi cabang di dalamnya.
import {
  checkPostpaidStatus,
  isDataBelumAda,
  payPostpaidBill,
} from "@/lib/digiflazz/postpaid";
import { findBillInquiryById } from "@/repositories/bill-inquiry.repository";
import type { BillInquiry } from "@/types/postpaid";
import type { Transaction } from "@/types/transaction";
import type { WalletChannel } from "@/types/wallet";

// Automatic backup-SKU failover cap — see applyDigiflazzResult's "Gagal"
// branch. Original attempt + this many backups = at most 3 total
// Digiflazz submissions per purchase, bounding both worst-case latency
// (each is a real synchronous network round trip) and how far the
// platform's margin can be eroded before it gives up and genuinely fails
// the purchase like before this mechanism existed.
const MAX_BACKUP_SKU_ATTEMPTS = 2;

// §5e (amandemen 2026-09-11) — dua aturan dari dokumentasi Cek Status
// Digiflazz yang sebelumnya tidak dijaga kode sama sekali:
//
// 1. "Pemanggilan API untuk transaksi/data yang sama tidak dilakukan
//    berulang dalam interval kurang dari 1 menit" — risiko race condition
//    atau duplikasi yang secara tertulis BUKAN tanggung jawab Digiflazz.
//    Di produksi, 7 dari 53 transaksi pertama sudah melanggarnya (6 oleh job,
//    3–50 detik setelah submit; 1 oleh 5 klik "Cek Status" dalam 89 detik).
export const PROVIDER_RECHECK_COOLDOWN_SECONDS = 60;
// 2. "Jangan pernah Cek Status transaksi yang sudah lewat 90 HARI karena
//    akan menyebabkan pembuatan transaksi BARU." Ditolak mulai 85 hari,
//    menyisakan jarak untuk selisih zona waktu dan jam.
const MAX_STATUS_CHECK_AGE_DAYS = 85;
// Job otomatis berhenti jauh sebelum itu. Sesudahnya transaksi hanya bisa
// dicek lewat tombol admin, yang tetap dibatasi dua aturan di atas.
export const AUTO_STATUS_CHECK_MAX_AGE_DAYS = 7;

export async function getTransactionList(filter: ListTransactionsFilter = {}) {
  return listTransactionsWithDetail(filter);
}

export async function getTransactionCount(filter: ListTransactionsFilter = {}) {
  return countTransactionsWithDetail(filter);
}

export async function getTransactionDetail(id: string) {
  const [transaction, events] = await Promise.all([findTransactionWithDetailById(id), listTransactionEvents(id)]);
  // Histori's "Saldo Awal / Total Bayar / Saldo Akhir" summary — reads
  // wallet_ledger, never touches the RESERVE/DEBIT/RELEASE write path.
  const balanceSummary = transaction ? await getTransactionBalanceSummary(id) : null;
  return { transaction, events, balanceSummary };
}

export async function getReservedTransactionsSummary() {
  return sumReservedTransactions();
}

export async function getTransactionProfitSummary(
  filter: Omit<ListTransactionsFilter, "status" | "search" | "limit" | "offset"> = {},
) {
  return sumTransactionProfit(filter);
}

// A buyer confirms a purchase by typing their transaction PIN, or — once
// Akun > Keamanan has a biometric credential registered for this device —
// with a biometric assertion instead: a WebAuthn assertion from the web
// app's browser, or a biometric_signature-signed challenge from the
// Flutter app (two different protocols for the same product feature,
// since a native app has no WebAuthn browser API to run that ceremony
// in — see mobile-biometric.service.ts). Exactly one of the three, so
// executeTransaction never has to guess which one to check.
export type TransactionAuth =
  | { method: "PIN"; pin: string }
  | { method: "BIOMETRIC"; assertion: AuthenticationResponseJSON }
  | { method: "MOBILE_BIOMETRIC"; assertion: MobileBiometricAssertion };

export interface ExecuteTransactionInput {
  walletId: string;
  productId: string;
  customerNumber: string;
  auth: TransactionAuth;
  idempotencyKey: string;
  channel: WalletChannel;
  /** The wallet owner confirming with their own PIN or biometric. */
  actorUserId: string;
  /** E-Money/Games' "Verifikasi Pengguna"/"Cek Username" result, if the
   *  mitra ran one for this customerNumber right before submitting —
   *  purely denormalized display data for Histori (Transaction.
   *  customer_name), never used for any authorization or pricing
   *  decision. Undefined when the category has no verification step or
   *  the mitra skipped it. */
  customerName?: string;
}

// The Transaction Engine: verify PIN -> reserve funds (atomic with
// creating the transaction row) -> call Digiflazz -> capture or release
// based on the real result. Mirrors the flow this session's Wallet/
// Commission work was built to support (M18 section 21-22: "Customer
// Transaction -> Referral Engine -> Commission Engine -> Wallet Credit").
// Has no UI caller yet — there is no buyer-facing checkout page in this
// codebase (Konter/BUMDes/Affiliate dashboards aren't built) — but this is
// the real, complete engine those future pages will call, not a stub.
// Verifikasi PIN/biometrik, dipakai bersama oleh pembelian prabayar dan
// pembayaran tagihan pascabayar. Satu tempat saja, supaya kedua jalur tidak
// pernah punya syarat konfirmasi yang berbeda.
export async function verifyTransactionAuth(actorUserId: string, auth: TransactionAuth): Promise<void> {
  if (auth.method === "PIN") {
    await verifyTransactionPin(actorUserId, auth.pin);
  } else if (auth.method === "BIOMETRIC") {
    await verifyTransactionBiometric(actorUserId, auth.assertion);
  } else {
    await verifyMobileBiometricTransaction(actorUserId, auth.assertion);
  }
}

export async function executeTransaction(input: ExecuteTransactionInput): Promise<Transaction> {
  await verifyTransactionAuth(input.actorUserId, input.auth);

  const product = await findProductById(input.productId);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }
  // §5f aturan 5: tagihan pascabayar tidak pernah dibeli lewat jalur ini.
  // Sebelum amandemen itu, permintaan buatan dengan id produk pascabayar
  // ditolak hanya sebagai EFEK SAMPING — pengecekan harga prabayar tidak
  // menemukan SKU-nya, lalu produknya ikut ditandai nonaktif. Aman secara
  // uang, tapi tidak pantas disebut penjaga.
  if (product.product_type !== "PREPAID") {
    throw new Error(
      "Produk ini adalah tagihan pascabayar. Bayar lewat menu Bayar Tagihan, setelah cek tagihan.",
    );
  }
  // Super Admin's own override (Produk page's Aktifkan/Nonaktifkan) — a
  // purely local decision Digiflazz has no say in, so it's checked here as
  // an immediate hard block. `status` itself is deliberately NOT checked
  // here anymore — it's only as fresh as the last catalog sync (now capped
  // at once per 5 minutes per Digiflazz's own rate-limit guidance), so the
  // live single-SKU check below (getLiveProductPricing) is what actually
  // gates Digiflazz-side availability, never this cached column.
  if (product.admin_disabled) {
    throw new Error("Produk sedang dinonaktifkan oleh admin");
  }

  if (product.category_id) {
    const category = await findCategoryById(product.category_id);
    if (category && category.status === "DISABLED") {
      throw new Error("Kategori produk ini sedang tidak tersedia");
    }
  }

  if (product.brand_id) {
    const brand = await findBrandById(product.brand_id);
    if (brand && brand.status === "DISABLED") {
      throw new Error("Brand produk ini sedang tidak tersedia");
    }
  }

  // Live, single-SKU check against Digiflazz right before reserving any
  // funds — per their own best-practice guidance for the moment a customer
  // has picked a specific product. Throws if Digiflazz now reports it
  // unavailable, and is the sole source of truth for both the base price
  // and the most-specific markup (PRODUCT > BRAND > CATEGORY > GLOBAL),
  // so what's actually charged can never drift from what was just fetched.
  const pricing = await getLiveProductPricing(product.id);
  const sellingPrice = Number(pricing.sellingPrice);

  const { transaction, alreadyExisted } = await withTransaction(async (client) => {
    const created = await createTransaction(
      {
        idempotency_key: input.idempotencyKey,
        wallet_id: input.walletId,
        product_id: input.productId,
        customer_number: input.customerNumber,
        base_price: product.base_price,
        selling_price: sellingPrice,
        customer_name: input.customerName?.trim() || null,
      },
      client,
    );

    if (!created.alreadyExisted) {
      await postLedgerEntry(client, {
        walletId: input.walletId,
        type: "RESERVE",
        amount: sellingPrice,
        channel: input.channel,
        transactionId: created.transaction.id,
        reference: created.transaction.idempotency_key,
        createdBy: input.actorUserId,
      });
      await recordTransactionEvent(
        { transaction_id: created.transaction.id, from_status: null, to_status: "RESERVED" },
        client,
      );
    }

    return created;
  });

  // A retried request with the same idempotency_key never re-reserves or
  // re-calls the provider — if it's already resolved, hand back that
  // state; if it's still RESERVED (first call never got a provider
  // response), fall through to checkTransactionStatus's same logic below.
  if (alreadyExisted && transaction.status !== "RESERVED") {
    return transaction;
  }

  // §5e: a retry that lands less than a minute after this ref_id last
  // reached Digiflazz (or on a transaction too old to check safely) hands
  // back the RESERVED row without calling Digiflazz. Both clients already
  // treat RESERVED as "still processing" and poll, and the job picks the
  // transaction up once the minute has passed.
  if (alreadyExisted) {
    const recheck = await evaluateProviderRecheck(transaction.id);
    if (!recheck.allowed) {
      return transaction;
    }
  }

  return settleWithProvider(transaction, product.sku, input.actorUserId);
}

type ProviderRecheckDecision =
  | { allowed: true }
  | { allowed: false; reason: "TOO_SOON"; waitSeconds: number }
  | { allowed: false; reason: "TOO_OLD" };

// The one place §5e's two Digiflazz rules are decided, shared by every path
// that can send an ALREADY-submitted ref_id back to Digiflazz: an admin's
// "Cek Status", the pending-transaction-check job (which also pre-filters
// the same rules in SQL), and a retried executeTransaction. Never applies to
// a transaction's first submit, nor to a backup-SKU retry (§5a) — that one
// carries a brand-new ref_id.
async function evaluateProviderRecheck(transactionId: string): Promise<ProviderRecheckDecision> {
  const timing = await getProviderContactTiming(transactionId);
  if (!timing) {
    throw new Error("Transaksi tidak ditemukan");
  }
  if (timing.age_seconds >= MAX_STATUS_CHECK_AGE_DAYS * 24 * 60 * 60) {
    return { allowed: false, reason: "TOO_OLD" };
  }
  if (timing.seconds_since_last_contact < PROVIDER_RECHECK_COOLDOWN_SECONDS) {
    return {
      allowed: false,
      reason: "TOO_SOON",
      waitSeconds: Math.max(1, Math.ceil(PROVIDER_RECHECK_COOLDOWN_SECONDS - timing.seconds_since_last_contact)),
    };
  }
  return { allowed: true };
}

// Resolves a transaction still stuck in RESERVED (provider never
// responded, or responded "Pending") by asking Digiflazz again with the
// same ref_id — their API treats a repeat ref_id as a status check, not a
// new purchase. Called both by an admin's "Cek Status" click (real
// actorUserId) and by the automated pending-transaction-check job (null —
// no human initiated it).
export async function checkTransactionStatus(
  transactionId: string,
  actorUserId: string | null,
): Promise<Transaction> {
  const transaction = await findTransactionById(transactionId);
  if (!transaction) {
    throw new Error("Transaksi tidak ditemukan");
  }
  if (transaction.status !== "RESERVED") {
    return transaction;
  }

  // §5e — refused with a message the admin's "Cek Status" button shows as
  // is. The job's own SQL already skips both cases, so it only lands here
  // if a webhook or an admin check touched the transaction between its
  // query and this call; that run then logs it as an error and the next
  // run, three minutes later, checks it normally.
  const recheck = await evaluateProviderRecheck(transaction.id);
  if (!recheck.allowed) {
    if (recheck.reason === "TOO_OLD") {
      // §5f aturan 8: alasannya berbeda untuk tagihan. Prabayar yang dicek di
      // atas 90 hari justru MEMBUAT pembelian baru; tagihan hanya dijawab
      // "Data belum ada", jadi pesannya tidak boleh menakut-nakuti dengan
      // sesuatu yang tidak akan terjadi.
      throw new Error(
        transaction.bill_inquiry_id
          ? `Tagihan ini sudah berumur lebih dari ${MAX_STATUS_CHECK_AGE_DAYS} hari. Digiflazz tidak lagi menyimpan datanya, jadi cek status tidak dikirim. Cocokkan langsung di dashboard Digiflazz.`
          : `Transaksi ini sudah berumur lebih dari ${MAX_STATUS_CHECK_AGE_DAYS} hari. Cek status tidak dikirim ke Digiflazz, karena untuk transaksi di atas 90 hari Digiflazz justru membuat pembelian baru. Periksa langsung di dashboard Digiflazz.`,
      );
    }
    throw new Error(`Transaksi ini baru saja diperiksa ke Digiflazz. Coba lagi dalam ${recheck.waitSeconds} detik.`);
  }

  const product = await findProductById(transaction.product_id);
  if (!product) {
    throw new Error("Produk pada transaksi ini tidak ditemukan");
  }

  return settleWithProvider(transaction, product.sku, actorUserId);
}

async function settleWithProvider(
  transaction: Transaction,
  buyerSkuCode: string,
  actorUserId: string | null,
  // Hanya diisi true oleh pembayaran tagihan yang PERTAMA. Setiap panggilan
  // lain untuk transaksi yang sama — job rekonsiliasi, tombol admin, atau
  // permintaan bayar yang diulang — memakai status-pasca, karena mengirim
  // ulang pay-pasca bukan cek status dan bisa membayar dua kali (§5f #3).
  opts: { postpaidFirstPayment?: boolean } = {},
): Promise<Transaction> {
  const credentials = await getActiveDigiflazzCredentials();
  if (!credentials) {
    return releaseTransaction(transaction, actorUserId, "Digiflazz belum dikonfigurasi");
  }

  let result: DigiflazzTransactionResult;
  try {
    if (transaction.bill_inquiry_id) {
      // Kode produk dan nomor pelanggan diambil dari SNAPSHOT hasil cek
      // tagihan, bukan dari katalog: status-pasca wajib memakai kode yang
      // sama dengan pay-pasca, dan katalog bisa berubah di antaranya
      // (§5f batasan 4).
      const inquiry = await findBillInquiryById(transaction.bill_inquiry_id);
      if (!inquiry) {
        throw new Error("Hasil cek tagihan untuk transaksi ini tidak ditemukan");
      }

      const pascaParams = {
        baseUrl: credentials.baseUrl,
        username: credentials.username,
        apiKey: credentials.apiKey,
        buyerSkuCode: inquiry.buyer_sku_code,
        customerNo: inquiry.customer_no,
        refId: transaction.idempotency_key,
        testing: credentials.mode === "development",
      };

      const pasca = opts.postpaidFirstPayment
        ? await payPostpaidBill(pascaParams)
        : await checkPostpaidStatus(pascaParams);

      // §5f aturan 7. "Data belum ada" bisa berarti transaksinya lewat 90
      // hari, TAPI bisa juga berarti pay-pasca kita tidak pernah sampai ke
      // Digiflazz — dan dari sisi sini keduanya tidak bisa dibedakan. Kalau
      // dianggap Gagal lalu saldo dilepas padahal tagihannya terbayar,
      // Digides membayar tagihan orang dengan uangnya sendiri. Jadi
      // transaksinya tetap tertahan untuk ditangani manual.
      if (pasca.status === "Gagal" && isDataBelumAda(pasca)) {
        await recordTransactionEvent({
          transaction_id: transaction.id,
          from_status: "RESERVED",
          to_status: "RESERVED",
          provider_raw_response: { ...pasca, catatan: "DATA_BELUM_ADA_SALDO_TIDAK_DILEPAS" },
        });
        return transaction;
      }

      // Bentuk jawabannya sama dengan prabayar pada medan yang dipakai
      // funnel: ref_id, status, rc, message, sn, price. Jadi ia masuk ke
      // applyDigiflazzResult yang sama persis (§5f, funnel tunggal utuh).
      return applyDigiflazzResult(transaction, pasca as DigiflazzTransactionResult, actorUserId);
    }

    result = await submitDigiflazzTransaction({
      baseUrl: credentials.baseUrl,
      username: credentials.username,
      apiKey: credentials.apiKey,
      buyerSkuCode,
      customerNo: transaction.customer_number,
      refId: transaction.idempotency_key,
      // Guards against paying Digiflazz more than we already reserved
      // from the buyer's wallet for this exact transaction — see
      // SubmitDigiflazzTransactionParams.maxPrice.
      maxPrice: Number(transaction.selling_price),
      // Digiflazz's development-mode account rejects every /transaction
      // call with a generic "Signature Anda salah" unless `testing` is
      // set — confirmed empirically (an intentionally wrong signature
      // gets the identical rc/message as our correctly-signed request
      // without this flag). Production mode has no such requirement.
      testing: credentials.mode === "development",
    });
  } catch (error) {
    // Network/parse failure — we genuinely don't know if Digiflazz
    // processed it. Leave RESERVED rather than guess; record the attempt
    // so the timeline shows why it's still pending.
    await recordTransactionEvent({
      transaction_id: transaction.id,
      from_status: "RESERVED",
      to_status: "RESERVED",
      provider_raw_response: { error: error instanceof Error ? error.message : String(error) },
    });
    throw new Error("Tidak dapat menghubungi Digiflazz. Transaksi tetap tertunda — periksa status lagi nanti.");
  }

  return applyDigiflazzResult(transaction, result, actorUserId);
}

// Shared by both ways a Digiflazz result reaches us: settleWithProvider
// (we called them, got an HTTP response) and the webhook route (they
// called us, pushing the same rc/status/message shape asynchronously once
// a "Pending" transaction resolves). Kept separate from settleWithProvider
// so the webhook path never has to make a second, redundant call to
// Digiflazz just to reuse this branching.
async function applyDigiflazzResult(
  transaction: Transaction,
  result: DigiflazzTransactionResult,
  actorUserId: string | null,
): Promise<Transaction> {
  if (result.status === "Sukses") {
    // §5f aturan 6: untuk tagihan, harga modal disamakan dengan yang
    // BENAR-BENAR dipotong Digiflazz sebelum komisi dan cashback dihitung.
    const disamakan = await syncPostpaidBasePrice(transaction, result);
    return captureTransaction(disamakan, result, actorUserId);
  }
  if (result.status === "Gagal") {
    const swapped = await trySwapToBackupSku(transaction, result, actorUserId);
    if (swapped) {
      return swapped;
    }
    return releaseTransaction(transaction, actorUserId, result.message, result);
  }

  await recordTransactionEvent({
    transaction_id: transaction.id,
    from_status: "RESERVED",
    to_status: "RESERVED",
    provider_raw_response: result,
  });
  return transaction;
}

// §5f aturan 6. pay-pasca tidak punya max_price, jadi tidak ada pagar di sisi
// Digiflazz kalau yang dipotong ternyata lebih besar daripada yang dijanjikan
// saat cek tagihan. Mitra tetap membayar angka yang ia setujui; selisihnya
// menggerus margin Digides, dan itu harus terlihat.
async function syncPostpaidBasePrice(
  transaction: Transaction,
  result: DigiflazzTransactionResult,
): Promise<Transaction> {
  if (!transaction.bill_inquiry_id) return transaction;

  const dipotong = Number(result.price ?? 0);
  const dijanjikan = Number(transaction.base_price);
  if (!Number.isFinite(dipotong) || dipotong <= dijanjikan) return transaction;

  const diperbarui = await updateTransactionBasePrice(transaction.id, dipotong);
  await recordTransactionEvent({
    transaction_id: transaction.id,
    from_status: "RESERVED",
    to_status: "RESERVED",
    provider_raw_response: {
      event: "POSTPAID_PRICE_MISMATCH",
      base_price_saat_cek_tagihan: dijanjikan,
      base_price_yang_dipotong: dipotong,
      selisih: dipotong - dijanjikan,
      selling_price_ke_mitra: transaction.selling_price,
    },
  });
  return diperbarui ?? transaction;
}

export interface ExecutePostpaidPaymentInput {
  inquiry: BillInquiry;
  actorUserId: string;
  channel: WalletChannel;
}

// Pembayaran tagihan. Bentuknya sengaja meniru executeTransaction sedekat
// mungkin: reservasi saldo dan pembuatan baris transaksi dalam SATU transaksi
// database, satu panggilan ke Digiflazz, lalu funnel hasil yang sama persis.
// Yang berbeda hanya asal angkanya — semuanya dari hasil cek tagihan yang
// sudah dilihat dan disetujui mitra, tidak dihitung ulang di sini (§5f #1).
//
// Verifikasi PIN/biometrik tidak dilakukan di sini, melainkan di
// postpaid.service sebelum fungsi ini dipanggil.
export async function executePostpaidPayment(input: ExecutePostpaidPaymentInput): Promise<Transaction> {
  const { inquiry } = input;
  const totalAmount = inquiry.total_amount;
  const providerPrice = inquiry.provider_price;
  if (!totalAmount || providerPrice === null) {
    throw new Error("Hasil cek tagihan tidak memuat nominal. Silakan cek tagihan ulang.");
  }

  const product = await findProductById(inquiry.product_id);
  if (!product) {
    throw new Error("Produk tagihan ini tidak ditemukan");
  }

  const { transaction, alreadyExisted } = await withTransaction(async (client) => {
    const created = await createTransaction(
      {
        // ref_id hasil cek tagihan menjadi kunci idempotensinya (§5f #2).
        idempotency_key: inquiry.ref_id,
        wallet_id: inquiry.wallet_id,
        product_id: inquiry.product_id,
        customer_number: inquiry.customer_no,
        base_price: providerPrice,
        selling_price: totalAmount,
        customer_name: inquiry.customer_name,
        bill_inquiry_id: inquiry.id,
      },
      client,
    );

    if (!created.alreadyExisted) {
      await postLedgerEntry(client, {
        walletId: inquiry.wallet_id,
        type: "RESERVE",
        amount: totalAmount,
        channel: input.channel,
        transactionId: created.transaction.id,
        reference: created.transaction.idempotency_key,
        createdBy: input.actorUserId,
      });
      await recordTransactionEvent(
        { transaction_id: created.transaction.id, from_status: null, to_status: "RESERVED" },
        client,
      );
    }

    return created;
  });

  if (alreadyExisted && transaction.status !== "RESERVED") {
    return transaction;
  }

  if (alreadyExisted) {
    // Permintaan bayar yang diulang untuk tagihan yang SAMA. pay-pasca tidak
    // pernah dikirim dua kali (§5f #3): kalau jeda 60 detik (§5e) belum lewat,
    // baris RESERVED dikembalikan dan klien tinggal polling; kalau sudah
    // lewat, yang dikirim adalah status-pasca.
    const recheck = await evaluateProviderRecheck(transaction.id);
    if (!recheck.allowed) {
      return transaction;
    }
    return settleWithProvider(transaction, product.sku, input.actorUserId);
  }

  return settleWithProvider(transaction, product.sku, input.actorUserId, { postpaidFirstPayment: true });
}

// Automatic backup-SKU failover (docs/architecture/
// FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md section 5a, amendment to
// rules #3/#8 — see that section for the full reasoning). Called only
// from applyDigiflazzResult's "Gagal" branch, so every path that can
// learn a transaction failed (the original synchronous submit, the
// Digiflazz webhook, and the pending-transaction-check job's re-check)
// gets this behavior uniformly, without a second funnel.
//
// Never touches the wallet ledger: the RESERVE already made for
// transaction.selling_price stays untouched and keeps covering whichever
// SKU ends up fulfilling the purchase — selling_price itself is never
// modified here, so the buyer's price never changes no matter how many
// backups are tried. Returns the transaction's final resolved state
// (SUCCESS/FAILED/still-RESERVED) if a backup was found and attempted;
// null if there was nothing left to try, so the caller falls back to
// releaseTransaction exactly as before this mechanism existed.
async function trySwapToBackupSku(
  transaction: Transaction,
  failedResult: DigiflazzTransactionResult,
  actorUserId: string | null,
): Promise<Transaction | null> {
  // §5f aturan 4: tagihan tidak punya SKU cadangan. ref_id-nya adalah
  // satu-satunya tautan ke hasil cek tagihan di sisi Digiflazz, seller lain
  // tidak mengenalnya, dan nominal tagihannya belum tentu sama. Ganti SKU =
  // cek tagihan baru = persetujuan mitra yang baru. Penjaga kedua ada di SQL
  // (findBackupProductCandidates menyaring product_type = 'PREPAID').
  if (transaction.bill_inquiry_id) {
    return null;
  }

  if (transaction.tried_product_ids.length > MAX_BACKUP_SKU_ATTEMPTS) {
    return null;
  }

  const failedProduct = await findProductById(transaction.product_id);
  if (!failedProduct?.category_id || !failedProduct.brand_id) {
    return null;
  }

  // Re-checked fresh on every attempt, not just once at the very first
  // submit — a transaction that was Pending before failing may only learn
  // that minutes later (webhook or the reconciliation job), and an admin
  // could have disabled the category/brand in that window.
  const [category, brand] = await Promise.all([
    findCategoryById(failedProduct.category_id),
    findBrandById(failedProduct.brand_id),
  ]);
  if (category?.status === "DISABLED" || brand?.status === "DISABLED") {
    return null;
  }

  // Claim a specific backup candidate and commit BEFORE ever calling
  // Digiflazz — the row lock must never be held across that network call.
  // See swapTransactionProductForBackup's doc comment for why the lock
  // (not just a status check) is what actually prevents two concurrent
  // callers from claiming the same backup slot.
  const claimed = await withTransaction(async (client) => {
    const locked = await lockTransactionForUpdate(transaction.id, client);
    if (!locked || locked.status !== "RESERVED") {
      return null;
    }

    const [candidate] = await findBackupProductCandidates(
      {
        categoryId: failedProduct.category_id!,
        brandId: failedProduct.brand_id!,
        productName: failedProduct.product_name,
        excludeProductIds: locked.tried_product_ids,
        sellingPriceCeiling: locked.selling_price,
      },
      client,
    );
    if (!candidate) {
      return null;
    }

    const newIdempotencyKey = randomUUID();
    const updated = await swapTransactionProductForBackup(
      transaction.id,
      candidate.id,
      candidate.base_price,
      newIdempotencyKey,
      client,
    );
    if (!updated) {
      return null;
    }

    await recordTransactionEvent(
      {
        transaction_id: transaction.id,
        from_status: "RESERVED",
        to_status: "RESERVED",
        provider_raw_response: {
          event: "BACKUP_SKU_SWAPPED",
          from_product_id: failedProduct.id,
          from_sku: failedProduct.sku,
          from_sku_failure: failedResult,
          to_product_id: candidate.id,
          to_sku: candidate.sku,
        },
      },
      client,
    );

    return { transaction: updated, buyerSkuCode: candidate.sku };
  });

  if (!claimed) {
    return null;
  }

  return settleWithProvider(claimed.transaction, claimed.buyerSkuCode, actorUserId);
}

// Processes an inbound Digiflazz webhook delivery — the near-real-time
// counterpart to checkTransactionStatus's manual/polled re-check. Verifies
// the signature against the raw body first (untrusted input: this route
// has no session, so authenticity rests entirely on the HMAC), then
// applies the exact same capture/release logic a synchronous response
// would have gone through.
export async function processDigiflazzWebhookEvent(
  rawBody: string,
  signatureHeader: string | null,
): Promise<Transaction | null> {
  const secret = await getDigiflazzWebhookSecret();
  if (!secret) {
    throw new Error("Webhook Digiflazz belum dikonfigurasi (Webhook Secret kosong)");
  }
  if (!verifyDigiflazzWebhookSignature(rawBody, signatureHeader, secret)) {
    throw new Error("Signature Digiflazz tidak valid");
  }

  const parsed = JSON.parse(rawBody) as { data?: DigiflazzTransactionResult; hook_id?: string };

  // Digiflazz sends this shape (no `data`, just `sed`/`hook_id`/`hook`) once
  // when a webhook is first configured, purely to verify the URL answers
  // with a 2xx — see https://developer.digiflazz.com/api/buyer/webhook/
  // ("Ping Event"). Never persisted on their side, no transaction to touch
  // here either — just acknowledge it so their dashboard shows the webhook
  // as verified instead of failed.
  if (!parsed.data?.ref_id && parsed.hook_id) {
    return null;
  }

  const result = parsed.data;
  if (!result?.ref_id) {
    throw new Error("Payload webhook tidak lengkap");
  }

  const transaction = await findTransactionByIdempotencyKey(result.ref_id);
  if (!transaction) {
    throw new Error("Transaksi tidak ditemukan");
  }

  // Digiflazz resends events (their own "resend" event type) and our own
  // polling job may have already resolved this first — a replay must be a
  // safe no-op, never a double capture/release.
  if (transaction.status !== "RESERVED") {
    return transaction;
  }

  return applyDigiflazzResult(transaction, result, null);
}

async function captureTransaction(
  transaction: Transaction,
  result: DigiflazzTransactionResult,
  actorUserId: string | null,
): Promise<Transaction> {
  const finalTransaction = await withTransaction(async (client) => {
    const transitioned = await transitionTransactionStatus(
      transaction.id,
      "RESERVED",
      "SUCCESS",
      { provider_transaction_id: result.sn },
      client,
    );
    if (!transitioned) {
      // Another process already resolved this — don't double-capture.
      return transaction;
    }

    await postLedgerEntry(client, {
      walletId: transaction.wallet_id,
      type: "DEBIT",
      amount: transaction.selling_price,
      channel: "SYSTEM",
      transactionId: transaction.id,
      reference: transaction.idempotency_key,
      createdBy: actorUserId,
    });
    await recordTransactionEvent(
      { transaction_id: transaction.id, from_status: "RESERVED", to_status: "SUCCESS", provider_raw_response: result },
      client,
    );

    return transitioned;
  });

  if (finalTransaction.status === "SUCCESS") {
    // Commission accrual must never undo a completed purchase — a failure
    // here is logged, not thrown, so the sale stands either way.
    await awardCommissionForTransaction(finalTransaction.id, actorUserId).catch((error) => {
      console.error(`Commission award failed for transaction ${finalTransaction.id}:`, error);
    });

    // Cashback runs AFTER commission, and that order is load-bearing (PRD
    // Cashback §6.2): both are paid out of the same margin, and cashback is
    // only allowed what commission left behind. Commission is a promise to
    // the upline that came first and must not be shrunk by a newer feature.
    //
    // Caught for the same reason commission is: the pulsa has already
    // reached the customer. Failing a completed sale because a reward could
    // not be written would manufacture a loss out of a gift.
    await awardCashbackForTransaction(finalTransaction.id, actorUserId).catch((error) => {
      console.error(`Cashback award failed for transaction ${finalTransaction.id}:`, error);
    });
  }

  return finalTransaction;
}

async function releaseTransaction(
  transaction: Transaction,
  actorUserId: string | null,
  reason: string,
  rawResponse?: unknown,
): Promise<Transaction> {
  return withTransaction(async (client) => {
    const transitioned = await transitionTransactionStatus(transaction.id, "RESERVED", "FAILED", {}, client);
    if (!transitioned) {
      return transaction;
    }

    await postLedgerEntry(client, {
      walletId: transaction.wallet_id,
      type: "RELEASE",
      amount: transaction.selling_price,
      channel: "SYSTEM",
      transactionId: transaction.id,
      reference: reason,
      createdBy: actorUserId,
    });
    await recordTransactionEvent(
      {
        transaction_id: transaction.id,
        from_status: "RESERVED",
        to_status: "FAILED",
        provider_raw_response: rawResponse ?? { reason },
      },
      client,
    );

    return transitioned;
  });
}
