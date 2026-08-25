import { withTransaction } from "@/lib/db/transaction";
import {
  createPayment,
  findPaymentById,
  findPaymentByGatewayReference,
  transitionPaymentStatus,
} from "@/repositories/payment.repository";
import { getWalletAccountDetail, getWalletByBumdesId, getWalletById, postLedgerEntry } from "@/repositories/wallet.repository";
import { recordAuditLog } from "@/repositories/audit.repository";
import { createSnapTransaction, verifyMidtransSignature } from "@/lib/midtrans/client";
import { getActiveMidtransCredentials } from "@/services/midtrans.service";
import { notifySuperAdmin } from "@/services/notification.service";
import { formatMoney } from "@/lib/formatting/money";

// Top Up follows issue M18 section 12's flow exactly: creating a request
// never touches the balance by itself (no "Tambah Saldo" shortcut) — only
// a separate, explicit approval does, and that approval is what actually
// posts the TOPUP ledger entry and moves the balance.

export interface CreateTopupRequestInput {
  walletId: string;
  amount: number;
  actorUserId: string;
}

export async function createTopupRequest(input: CreateTopupRequestInput) {
  if (!(input.amount > 0)) {
    throw new Error("Nominal top up harus lebih besar dari nol");
  }

  return withTransaction(async (client) => {
    const payment = await createPayment(
      { wallet_id: input.walletId, amount: input.amount, method: "MANUAL", created_by: input.actorUserId },
      client,
    );

    await recordAuditLog(
      {
        actor_user_id: input.actorUserId,
        action: "TOPUP_REQUESTED",
        entity: "payments",
        entity_id: payment.id,
        new_value: { wallet_id: input.walletId, amount: input.amount },
      },
      client,
    );

    const wallet = await getWalletById(input.walletId, client);
    const account = wallet ? await getWalletAccountDetail(wallet.wallet_account_id, client) : null;

    await notifySuperAdmin(
      "MITRA_TOPUP_REQUESTED",
      `Permintaan top up dari ${account?.owner_name ?? "mitra"}`,
      `Mengajukan top up sebesar ${formatMoney(input.amount)} — perlu diverifikasi di menu Wallet.`,
      "payments",
      payment.id,
      client,
    );

    return payment;
  });
}

export async function approveTopup(paymentId: string, actorUserId: string) {
  return withTransaction(async (client) => {
    const payment = await findPaymentById(paymentId, client);
    if (!payment) {
      throw new Error("Permintaan top up tidak ditemukan");
    }

    // Compare-and-swap: if this returns null, someone else already
    // approved/rejected it first — fail loudly rather than double-credit.
    const transitioned = await transitionPaymentStatus(paymentId, "PENDING", "SUCCESS", null, client);
    if (!transitioned) {
      throw new Error("Top up ini sudah diproses sebelumnya");
    }

    const { wallet, ledgerEntry } = await postLedgerEntry(client, {
      walletId: payment.wallet_id,
      type: "TOPUP",
      amount: payment.amount,
      channel: "ADMIN",
      reference: payment.id,
      createdBy: actorUserId,
    });

    await recordAuditLog(
      {
        actor_user_id: actorUserId,
        action: "TOPUP_APPROVED",
        entity: "payments",
        entity_id: paymentId,
        new_value: { ledger_entry_id: ledgerEntry.id },
      },
      client,
    );

    return { payment: transitioned, wallet, ledgerEntry };
  });
}

export interface SendTopupToMitraInput {
  bumdesId: string;
  amount: number;
  actorUserId: string;
}

// "Kirim Saldo ke Mitra" (Mitra menu) is a direct capital injection from
// the Super Admin, not an agent-submitted request awaiting proof — the
// admin's action is the approval, so it goes straight to a ledgered
// TOPUP with no intermediate `payments` row, unlike createTopupRequest/
// approveTopup above. Still fully ledgered and audited either way.
export async function sendTopupToMitra(input: SendTopupToMitraInput) {
  if (!(input.amount > 0)) {
    throw new Error("Nominal top up harus lebih besar dari nol");
  }

  const wallet = await getWalletByBumdesId(input.bumdesId);
  if (!wallet) {
    throw new Error("Wallet mitra tidak ditemukan");
  }

  return withTransaction(async (client) => {
    const result = await postLedgerEntry(client, {
      walletId: wallet.id,
      type: "TOPUP",
      amount: input.amount,
      channel: "ADMIN",
      reference: `Kirim saldo langsung ke mitra ${input.bumdesId}`,
      createdBy: input.actorUserId,
    });

    await recordAuditLog(
      {
        actor_user_id: input.actorUserId,
        action: "MITRA_TOPUP_SENT",
        entity: "bumdes",
        entity_id: input.bumdesId,
        new_value: { amount: input.amount, ledger_entry_id: result.ledgerEntry.id },
      },
      client,
    );

    return result;
  });
}

export async function rejectTopup(paymentId: string, actorUserId: string, reason: string) {
  if (!reason.trim()) {
    throw new Error("Alasan penolakan wajib diisi");
  }

  return withTransaction(async (client) => {
    const transitioned = await transitionPaymentStatus(paymentId, "PENDING", "FAILED", null, client);
    if (!transitioned) {
      throw new Error("Top up ini sudah diproses sebelumnya");
    }

    await recordAuditLog(
      {
        actor_user_id: actorUserId,
        action: "TOPUP_REJECTED",
        entity: "payments",
        entity_id: paymentId,
        new_value: { reason },
      },
      client,
    );

    return transitioned;
  });
}

// --- Midtrans self-service top-up ---------------------------------------
//
// Unlike createTopupRequest/approveTopup above (an agent submits a
// request, an admin later approves it after checking proof), a Midtrans
// top-up is resolved automatically by /api/webhooks/midtrans the moment
// Midtrans reports the payment as settled — no admin click in between.
// Has no UI caller yet (no self-service top-up page exists), but this is
// the real engine such a page will call.

export interface CreateMidtransTopupInput {
  walletId: string;
  amount: number;
  actorUserId: string;
  customerDetails?: { first_name?: string; email?: string; phone?: string };
}

export async function createMidtransTopupPayment(input: CreateMidtransTopupInput) {
  if (!(input.amount > 0)) {
    throw new Error("Nominal top up harus lebih besar dari nol");
  }

  const credentials = await getActiveMidtransCredentials();
  if (!credentials) {
    throw new Error("Midtrans belum dikonfigurasi");
  }

  // order_id doubles as payments.gateway_reference — the webhook looks the
  // payment back up by this value, and Midtrans's own idempotency treats a
  // repeated order_id as the same transaction rather than a new one.
  const orderId = `topup-${input.walletId}-${Date.now()}`;

  const payment = await createPayment({
    wallet_id: input.walletId,
    amount: input.amount,
    method: "MIDTRANS",
    gateway_reference: orderId,
    created_by: input.actorUserId,
  });

  await recordAuditLog({
    actor_user_id: input.actorUserId,
    action: "MIDTRANS_TOPUP_REQUESTED",
    entity: "payments",
    entity_id: payment.id,
    new_value: { wallet_id: input.walletId, amount: input.amount, order_id: orderId },
  });

  // The Snap call is a real external HTTP round-trip — deliberately kept
  // outside any DB transaction (same reasoning as the Transaction Engine's
  // Digiflazz call) so a slow/failed request never holds a DB connection
  // or lock open.
  try {
    const snap = await createSnapTransaction({
      mode: credentials.mode,
      serverKey: credentials.serverKey,
      orderId,
      grossAmount: input.amount,
      customerDetails: input.customerDetails,
    });
    return { payment, snapToken: snap.token, redirectUrl: snap.redirect_url };
  } catch (error) {
    // Nothing was actually created on Midtrans's side — the payment row
    // shouldn't sit PENDING forever with no way to complete it.
    await transitionPaymentStatus(payment.id, "PENDING", "FAILED", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export interface MidtransNotificationPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  [key: string]: unknown;
}

// The webhook's entire job: verify the notification really came from
// Midtrans, then translate transaction_status into the same
// PENDING -> SUCCESS/FAILED transition + TOPUP ledger entry approveTopup
// makes for a manually-approved request — just with no admin actor
// (createdBy/actor_user_id are null, "the system" did this).
export async function processMidtransNotification(payload: MidtransNotificationPayload) {
  const credentials = await getActiveMidtransCredentials();
  if (!credentials) {
    throw new Error("Midtrans belum dikonfigurasi");
  }

  const signatureValid = verifyMidtransSignature({
    orderId: payload.order_id,
    statusCode: payload.status_code,
    grossAmount: payload.gross_amount,
    serverKey: credentials.serverKey,
    signatureKey: payload.signature_key,
  });
  if (!signatureValid) {
    throw new Error("Signature Midtrans tidak valid");
  }

  const payment = await findPaymentByGatewayReference(payload.order_id);
  if (!payment) {
    throw new Error("Pembayaran tidak ditemukan");
  }

  // Already resolved by an earlier notification — Midtrans retries
  // notifications, so a replay must be a safe no-op, not a double-credit.
  if (payment.status !== "PENDING") {
    return payment;
  }

  const isSuccess =
    payload.transaction_status === "settlement" ||
    (payload.transaction_status === "capture" && (payload.fraud_status ?? "accept") === "accept");
  const isExpired = payload.transaction_status === "expire";
  const isFailed =
    payload.transaction_status === "deny" ||
    payload.transaction_status === "cancel" ||
    payload.fraud_status === "deny";

  if (isSuccess) {
    return withTransaction(async (client) => {
      const transitioned = await transitionPaymentStatus(payment.id, "PENDING", "SUCCESS", payload, client);
      if (!transitioned) return payment;

      const { ledgerEntry } = await postLedgerEntry(client, {
        walletId: payment.wallet_id,
        type: "TOPUP",
        amount: payment.amount,
        channel: "WEB",
        reference: payment.id,
        createdBy: null,
      });

      await recordAuditLog(
        {
          actor_user_id: null,
          action: "MIDTRANS_TOPUP_SUCCESS",
          entity: "payments",
          entity_id: payment.id,
          new_value: { order_id: payload.order_id, ledger_entry_id: ledgerEntry.id },
        },
        client,
      );

      return transitioned;
    });
  }

  if (isExpired || isFailed) {
    return withTransaction(async (client) => {
      const transitioned = await transitionPaymentStatus(
        payment.id,
        "PENDING",
        isExpired ? "EXPIRED" : "FAILED",
        payload,
        client,
      );
      if (!transitioned) return payment;

      await recordAuditLog(
        {
          actor_user_id: null,
          action: "MIDTRANS_TOPUP_FAILED",
          entity: "payments",
          entity_id: payment.id,
          new_value: { order_id: payload.order_id, transaction_status: payload.transaction_status },
        },
        client,
      );

      await notifySuperAdmin(
        "MIDTRANS_TOPUP_FAILED",
        "Top up mandiri gagal",
        `Pembayaran ${formatMoney(payment.amount)} via Midtrans ${isExpired ? "kedaluwarsa" : "ditolak"} (${payload.transaction_status}).`,
        "payments",
        payment.id,
        client,
      );

      return transitioned;
    });
  }

  // Still in flight ("pending", or a challenge under fraud review) —
  // record the raw payload without moving out of PENDING.
  await transitionPaymentStatus(payment.id, "PENDING", "PENDING", payload);
  return payment;
}
