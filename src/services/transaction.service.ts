import { withTransaction } from "@/lib/db/transaction";
import { getActiveDigiflazzCredentials, getDigiflazzWebhookSecret } from "@/services/digiflazz.service";
import { submitDigiflazzTransaction, type DigiflazzTransactionResult } from "@/lib/digiflazz/transaction";
import { verifyDigiflazzWebhookSignature } from "@/lib/digiflazz/webhook";
import { verifyTransactionPin } from "@/services/auth.service";
import { verifyTransactionBiometric } from "@/services/biometric.service";
import { verifyMobileBiometricTransaction, type MobileBiometricAssertion } from "@/services/mobile-biometric.service";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { awardCommissionForTransaction } from "@/services/commission.service";
import { findBrandById, findCategoryById, findProductById } from "@/repositories/product.repository";
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
  recordTransactionEvent,
  sumReservedTransactions,
  transitionTransactionStatus,
  type ListTransactionsFilter,
} from "@/repositories/transaction.repository";
import type { Transaction } from "@/types/transaction";
import type { WalletChannel } from "@/types/wallet";

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
}

// The Transaction Engine: verify PIN -> reserve funds (atomic with
// creating the transaction row) -> call Digiflazz -> capture or release
// based on the real result. Mirrors the flow this session's Wallet/
// Commission work was built to support (M18 section 21-22: "Customer
// Transaction -> Referral Engine -> Commission Engine -> Wallet Credit").
// Has no UI caller yet — there is no buyer-facing checkout page in this
// codebase (Konter/BUMDes/Affiliate dashboards aren't built) — but this is
// the real, complete engine those future pages will call, not a stub.
export async function executeTransaction(input: ExecuteTransactionInput): Promise<Transaction> {
  if (input.auth.method === "PIN") {
    await verifyTransactionPin(input.actorUserId, input.auth.pin);
  } else if (input.auth.method === "BIOMETRIC") {
    await verifyTransactionBiometric(input.actorUserId, input.auth.assertion);
  } else {
    await verifyMobileBiometricTransaction(input.actorUserId, input.auth.assertion);
  }

  const product = await findProductById(input.productId);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
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

  return settleWithProvider(transaction, product.sku, input.actorUserId);
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
): Promise<Transaction> {
  const credentials = await getActiveDigiflazzCredentials();
  if (!credentials) {
    return releaseTransaction(transaction, actorUserId, "Digiflazz belum dikonfigurasi");
  }

  let result: DigiflazzTransactionResult;
  try {
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
    return captureTransaction(transaction, result, actorUserId);
  }
  if (result.status === "Gagal") {
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
