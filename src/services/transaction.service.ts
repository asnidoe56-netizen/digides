import { withTransaction } from "@/lib/db/transaction";
import { getActiveDigiflazzCredentials, getDigiflazzWebhookSecret } from "@/services/digiflazz.service";
import { submitDigiflazzTransaction, type DigiflazzTransactionResult } from "@/lib/digiflazz/transaction";
import { verifyDigiflazzWebhookSignature } from "@/lib/digiflazz/webhook";
import { verifyTransactionPin } from "@/services/auth.service";
import { awardCommissionForTransaction } from "@/services/commission.service";
import { findBrandById, findCategoryById, findProductById } from "@/repositories/product.repository";
import { getEffectiveMarkupValue } from "@/services/pricing.service";
import { postLedgerEntry } from "@/repositories/wallet.repository";
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
  return { transaction, events };
}

export async function getReservedTransactionsSummary() {
  return sumReservedTransactions();
}

export interface ExecuteTransactionInput {
  walletId: string;
  productId: string;
  customerNumber: string;
  pin: string;
  idempotencyKey: string;
  channel: WalletChannel;
  /** The wallet owner confirming with their own PIN. */
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
  await verifyTransactionPin(input.actorUserId, input.pin);

  const product = await findProductById(input.productId);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }
  if (product.status !== "ACTIVE") {
    throw new Error("Produk sedang tidak tersedia");
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

  // Most-specific markup wins (PRODUCT > BRAND > CATEGORY > GLOBAL) — the
  // real charge must match exactly what the buyer was shown while
  // browsing (catalog.service.ts's getCategoryPurchaseCatalog uses the
  // same resolver), not just the category's flat markup.
  const markup = await getEffectiveMarkupValue(product);
  const sellingPrice = Number(product.base_price) + Number(markup);

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
export async function processDigiflazzWebhookEvent(rawBody: string, signatureHeader: string | null): Promise<Transaction> {
  const secret = await getDigiflazzWebhookSecret();
  if (!secret) {
    throw new Error("Webhook Digiflazz belum dikonfigurasi (Webhook Secret kosong)");
  }
  if (!verifyDigiflazzWebhookSignature(rawBody, signatureHeader, secret)) {
    throw new Error("Signature Digiflazz tidak valid");
  }

  const parsed = JSON.parse(rawBody) as { data?: DigiflazzTransactionResult };
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
