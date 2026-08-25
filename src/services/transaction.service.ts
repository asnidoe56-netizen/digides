import { withTransaction } from "@/lib/db/transaction";
import { getActiveDigiflazzCredentials } from "@/services/digiflazz.service";
import { submitDigiflazzTransaction, type DigiflazzTransactionResult } from "@/lib/digiflazz/transaction";
import { verifyTransactionPin } from "@/services/auth.service";
import { awardCommissionForTransaction } from "@/services/commission.service";
import {
  findBrandById,
  findCategoryById,
  findProductById,
  getCategoryMarkupValue,
} from "@/repositories/product.repository";
import { postLedgerEntry } from "@/repositories/wallet.repository";
import {
  createTransaction,
  findTransactionById,
  listTransactionEvents,
  listTransactionsWithDetail,
  countTransactionsWithDetail,
  findTransactionWithDetailById,
  recordTransactionEvent,
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

  const markup = await getCategoryMarkupValue(product.category_id);
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
// new purchase. The one real action the Transaksi monitoring page offers
// beyond viewing.
export async function checkTransactionStatus(transactionId: string, actorUserId: string): Promise<Transaction> {
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

async function settleWithProvider(transaction: Transaction, buyerSkuCode: string, actorUserId: string): Promise<Transaction> {
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

async function captureTransaction(
  transaction: Transaction,
  result: DigiflazzTransactionResult,
  actorUserId: string,
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
  actorUserId: string,
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
