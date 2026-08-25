import { recordAuditLog } from "@/repositories/audit.repository";
import {
  countReconciliationRecords,
  createReconciliationRecord,
  findReconciliationRecordById,
  listReconciliationRecords,
  resolveRecord,
  type ListReconciliationFilter,
} from "@/repositories/reconciliation.repository";
import { listTransactionsWithDetail, type TransactionWithDetail } from "@/repositories/transaction.repository";
import { getActiveDigiflazzCredentials, type DigiflazzCredentials } from "@/services/digiflazz.service";
import { notifySuperAdmin } from "@/services/notification.service";
import { submitDigiflazzTransaction, type DigiflazzTransactionStatus } from "@/lib/digiflazz/transaction";
import type { ReconciliationCategory } from "@/types/reconciliation";
import type { TransactionStatus } from "@/types/transaction";

// One run never checks unbounded history against a real third-party API —
// bounded the same way a batch job would be, so triggering this from the
// UI can't accidentally hammer Digiflazz.
const MAX_TRANSACTIONS_PER_RUN = 50;

export async function getReconciliationRecords(filter: ListReconciliationFilter = {}) {
  return listReconciliationRecords(filter);
}

export async function getReconciliationRecordCount(filter: ListReconciliationFilter = {}) {
  return countReconciliationRecords(filter);
}

export async function resolveReconciliationRecord(id: string, note: string, actorUserId: string) {
  if (!note.trim()) {
    throw new Error("Catatan penyelesaian wajib diisi");
  }

  const record = await resolveRecord(id, note);
  if (!record) {
    throw new Error("Catatan rekonsiliasi tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "RECONCILIATION_RESOLVED",
    entity: "reconciliation_records",
    entity_id: record.id,
    new_value: { note },
  });

  return record;
}

// SUCCESS must have come back "Sukses" from Digiflazz, FAILED must have
// come back "Gagal", and anything still in flight locally (RESERVED/
// PENDING) is only consistent while Digiflazz still calls it "Pending" —
// anything else is a real drift between what we think happened and what
// the provider says happened.
function statusesCorrespond(localStatus: TransactionStatus, providerStatus: DigiflazzTransactionStatus): boolean {
  if (localStatus === "SUCCESS" || localStatus === "REFUNDED") return providerStatus === "Sukses";
  if (localStatus === "FAILED") return providerStatus === "Gagal";
  return providerStatus === "Pending";
}

async function reconcileOneTransaction(
  transaction: TransactionWithDetail,
  credentials: DigiflazzCredentials,
): Promise<ReconciliationCategory> {
  let category: ReconciliationCategory;
  let providerStatus: string | null = null;
  let providerAmount: string | null = null;

  try {
    const result = await submitDigiflazzTransaction({
      baseUrl: credentials.baseUrl,
      username: credentials.username,
      apiKey: credentials.apiKey,
      buyerSkuCode: transaction.product_sku,
      customerNo: transaction.customer_number,
      refId: transaction.idempotency_key,
    });

    providerStatus = result.status;
    providerAmount = result.price != null ? String(result.price) : null;

    if (!statusesCorrespond(transaction.status, result.status)) {
      category = "STATUS_MISMATCH";
    } else if (providerAmount !== null && Number(providerAmount) !== Number(transaction.selling_price)) {
      category = "AMOUNT_MISMATCH";
    } else {
      category = "MATCH";
    }
  } catch (error) {
    // Couldn't get a confident answer from Digiflazz at all (network
    // error, unexpected response shape) — flagged for a human, not
    // silently dropped and not guessed into MATCH or STATUS_MISMATCH.
    category = "NEED_REVIEW";
    providerStatus = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  await createReconciliationRecord({
    transaction_id: transaction.id,
    provider_reference: transaction.provider_transaction_id,
    local_status: transaction.status,
    provider_status: providerStatus,
    local_amount: transaction.selling_price,
    provider_amount: providerAmount,
    category,
  });

  return category;
}

export interface RunReconciliationInput {
  dateFrom?: Date;
  dateTo?: Date;
  actorUserId: string;
}

export interface RunReconciliationResult {
  checked: number;
  byCategory: Record<ReconciliationCategory, number>;
}

// Sweeps local transactions in the given window and asks Digiflazz about
// each one (same ref_id trick as Transaction Engine's checkTransactionStatus
// — a repeat ref_id is a status check, not a new purchase), classifying
// the result into a reconciliation_records row per transaction. LOCAL_ONLY
// and PROVIDER_ONLY aren't produced automatically here: telling "ref_id
// genuinely doesn't exist on Digiflazz" apart from other error responses
// would need a confirmed rc code for that case, and PROVIDER_ONLY would
// need a "list all my transactions" call Digiflazz's basic API doesn't
// expose — both stay available as categories for manual/future use rather
// than being guessed at.
export async function runReconciliation(input: RunReconciliationInput): Promise<RunReconciliationResult> {
  const credentials = await getActiveDigiflazzCredentials();
  if (!credentials) {
    throw new Error("Digiflazz belum dikonfigurasi");
  }

  const transactions = await listTransactionsWithDetail({
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    limit: MAX_TRANSACTIONS_PER_RUN,
  });

  const byCategory: Record<ReconciliationCategory, number> = {
    MATCH: 0,
    STATUS_MISMATCH: 0,
    AMOUNT_MISMATCH: 0,
    LOCAL_ONLY: 0,
    PROVIDER_ONLY: 0,
    NEED_REVIEW: 0,
  };

  for (const transaction of transactions) {
    const category = await reconcileOneTransaction(transaction, credentials);
    byCategory[category] += 1;
  }

  if (transactions.length > 0) {
    await recordAuditLog({
      actor_user_id: input.actorUserId,
      action: "RECONCILIATION_RUN",
      entity: "reconciliation_records",
      entity_id: transactions[0].id,
      new_value: { checked: transactions.length, byCategory },
    });
  }

  const issueCount = byCategory.STATUS_MISMATCH + byCategory.AMOUNT_MISMATCH + byCategory.NEED_REVIEW;
  if (issueCount > 0) {
    await notifySuperAdmin(
      "RECONCILIATION_ISSUE",
      `${issueCount} ketidaksesuaian ditemukan`,
      `Rekonsiliasi menemukan ${byCategory.STATUS_MISMATCH} status tidak cocok, ${byCategory.AMOUNT_MISMATCH} nominal tidak cocok, ${byCategory.NEED_REVIEW} perlu ditinjau.`,
    );
  }

  return { checked: transactions.length, byCategory };
}
