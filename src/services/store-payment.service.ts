import crypto from "node:crypto";
import { withTransaction } from "@/lib/db/transaction";
import { postLedgerEntry } from "@/repositories/wallet.repository";
import { recordAuditLog } from "@/repositories/audit.repository";
import { findStoreByOwnerUserId, findStoreById } from "@/repositories/store.repository";
import { findStoreProductById, decrementStoreProductStock } from "@/repositories/store-product.repository";
import {
  createStoreOrder as createStoreOrderRow,
  findStoreOrderById,
  listStoreOrderItems,
  markStoreOrderPaid,
} from "@/repositories/store-order.repository";
import {
  createStorePaymentRequest,
  findStorePaymentRequestById,
  claimStorePaymentRequestForPayment,
  expireStorePaymentRequest,
} from "@/repositories/store-payment.repository";
import { verifyTransactionPin } from "@/services/auth.service";
import { getWalletForMitraSession } from "@/services/wallet.service";
import { getWalletForStore } from "@/services/store.service";
import type { Store } from "@/types/store";
import type { StoreOrder, StoreOrderItem, StorePaymentRequest } from "@/types/store-order";

const PAYMENT_REQUEST_TTL_MS = 5 * 60 * 1000;

export interface CreateStoreOrderItemInput {
  storeProductId: string;
  quantity: number;
}

export interface CreateStoreOrderInput {
  ownerUserId: string;
  items: CreateStoreOrderItemInput[];
}

export interface CreateStoreOrderResult {
  store: Store;
  order: StoreOrder;
  items: StoreOrderItem[];
  paymentRequest: StorePaymentRequest;
}

// PRD Digides Toko §5 steps 1-2: the cashier (always the store's own owner
// in the MVP — §3 explicitly excludes additional kasir/employee accounts)
// builds a cart and the server locks in an order + a 5-minute payment
// request. Nothing here touches any wallet or stock yet — §5 defers both
// to step 6, confirmStorePayment below, so building a cart never has a
// financial side effect on its own.
export async function createStoreOrder(input: CreateStoreOrderInput): Promise<CreateStoreOrderResult> {
  if (input.items.length === 0) {
    throw new Error("Keranjang tidak boleh kosong");
  }

  const store = await findStoreByOwnerUserId(input.ownerUserId);
  if (!store) {
    throw new Error("Anda belum memiliki toko terdaftar");
  }
  if (store.status !== "ACTIVE") {
    throw new Error("Toko Anda belum diverifikasi, belum bisa menerima pembayaran");
  }

  const orderItems: { store_product_id: string; product_name: string; unit_price: string; quantity: number; subtotal: string }[] = [];
  let total = 0;
  for (const line of input.items) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new Error("Jumlah produk tidak valid");
    }
    const product = await findStoreProductById(line.storeProductId);
    if (!product || product.store_id !== store.id) {
      throw new Error("Produk tidak ditemukan di toko Anda");
    }
    if (!product.is_active) {
      throw new Error(`Produk "${product.name}" sedang nonaktif`);
    }
    const unitPrice = Number(product.price);
    const subtotal = unitPrice * line.quantity;
    total += subtotal;
    orderItems.push({
      store_product_id: product.id,
      product_name: product.name,
      unit_price: String(unitPrice),
      quantity: line.quantity,
      subtotal: String(subtotal),
    });
  }

  return withTransaction(async (client) => {
    const { order, items } = await createStoreOrderRow(
      { store_id: store.id, total_amount: String(total), created_by: input.ownerUserId, items: orderItems },
      client,
    );

    // Generated server-side, not client-supplied (§5 step 2's own
    // wording) — the actual double-payment guard lives downstream, on
    // store_payment_requests.status's compare-and-swap (see
    // claimStorePaymentRequestForPayment), not on this key.
    const paymentRequest = await createStorePaymentRequest(
      {
        order_id: order.id,
        idempotency_key: crypto.randomUUID(),
        amount: order.total_amount,
        expires_at: new Date(Date.now() + PAYMENT_REQUEST_TTL_MS),
      },
      client,
    );

    return { store, order, items, paymentRequest };
  });
}

export interface StorePaymentDetail {
  store: Pick<Store, "id" | "name">;
  order: StoreOrder;
  items: StoreOrderItem[];
  paymentRequest: StorePaymentRequest;
}

// PRD §5 step 4: what a buyer's app shows right after scanning the QR —
// store name, line items, total, and the request's own status/expiry so
// the client can show "sudah kedaluwarsa" without needing to guess from a
// clock alone. Read-only; never mutates anything (the lazy expiry flip
// only happens inside confirmStorePayment, where a real payment attempt
// is actually being made).
export async function getStorePaymentDetail(paymentRequestId: string): Promise<StorePaymentDetail> {
  const paymentRequest = await findStorePaymentRequestById(paymentRequestId);
  if (!paymentRequest) {
    throw new Error("Permintaan pembayaran tidak ditemukan");
  }
  const order = await findStoreOrderById(paymentRequest.order_id);
  if (!order) {
    throw new Error("Pesanan tidak ditemukan");
  }
  const [store, items] = await Promise.all([findStoreById(order.store_id), listStoreOrderItems(order.id)]);
  if (!store) {
    throw new Error("Toko tidak ditemukan");
  }

  return { store: { id: store.id, name: store.name }, order, items, paymentRequest };
}

export interface ConfirmStorePaymentInput {
  paymentRequestId: string;
  buyerUserId: string;
  buyerRoles: string[];
  pin: string;
}

function statusRejectionMessage(status: StorePaymentRequest["status"]): string {
  switch (status) {
    case "KEDALUWARSA":
      return "Permintaan pembayaran sudah kedaluwarsa";
    case "DIBATALKAN":
      return "Permintaan pembayaran sudah dibatalkan";
    case "GAGAL":
      return "Permintaan pembayaran gagal, tidak bisa dibayar";
    default:
      return "Permintaan pembayaran tidak bisa diproses";
  }
}

// PRD §5 steps 5-7 / §6's financial rules — the buyer-facing confirmation.
// Runs entirely on the buyer's own session (their own PIN, verified on
// their own account — §6 rule 2, a merchant's device/session never sees
// this), and does its real financial work — debit buyer, credit store,
// decrement stock, mark the order paid — as one all-or-nothing DB
// transaction (§6 rule 3): any failure partway through (insufficient
// stock, insufficient balance) throws and rolls back everything, including
// the payment request's own status flip, so a failed attempt never leaves
// stock or a balance changed (§6 rule 6) and the request stays payable
// (still MENUNGGU) for a genuine retry — e.g. after topping up.
export async function confirmStorePayment(input: ConfirmStorePaymentInput) {
  await verifyTransactionPin(input.buyerUserId, input.pin);

  const paymentRequest = await findStorePaymentRequestById(input.paymentRequestId);
  if (!paymentRequest) {
    throw new Error("Permintaan pembayaran tidak ditemukan");
  }
  const order = await findStoreOrderById(paymentRequest.order_id);
  if (!order) {
    throw new Error("Pesanan tidak ditemukan");
  }

  if (paymentRequest.status === "BERHASIL") {
    if (paymentRequest.paid_by_user_id === input.buyerUserId) {
      // Safe retry (§6 rule 4) — the same buyer confirming again (double
      // tap, a timed-out request they resubmit) gets the same result back
      // instead of an error, never a second payment.
      const items = await listStoreOrderItems(order.id);
      return { order, items, paymentRequest };
    }
    throw new Error("Pembayaran ini sudah diselesaikan oleh pengguna lain");
  }
  if (paymentRequest.status !== "MENUNGGU") {
    throw new Error(statusRejectionMessage(paymentRequest.status));
  }
  if (paymentRequest.expires_at.getTime() <= Date.now()) {
    await expireStorePaymentRequest(paymentRequest.id);
    throw new Error(statusRejectionMessage("KEDALUWARSA"));
  }

  const [buyerWallet, storeWallet, items] = await Promise.all([
    getWalletForMitraSession(input.buyerUserId, input.buyerRoles),
    getWalletForStore(order.store_id),
    listStoreOrderItems(order.id),
  ]);
  if (!buyerWallet) {
    throw new Error("Wallet Anda tidak ditemukan");
  }
  if (!storeWallet) {
    throw new Error("Wallet toko tidak ditemukan");
  }

  return withTransaction(async (client) => {
    const claimed = await claimStorePaymentRequestForPayment(paymentRequest.id, input.buyerUserId, client);
    if (!claimed) {
      // Lost a race (concurrent confirm on the same request) or it
      // expired in the instant since the check above — re-read the
      // now-final state and react the same way the pre-transaction
      // checks above do, never silently succeed on a claim we didn't win.
      const current = await findStorePaymentRequestById(paymentRequest.id, client);
      if (current?.status === "BERHASIL" && current.paid_by_user_id === input.buyerUserId) {
        return { order, items, paymentRequest: current };
      }
      if (current?.status === "BERHASIL") {
        throw new Error("Pembayaran ini sudah diselesaikan oleh pengguna lain");
      }
      throw new Error(statusRejectionMessage(current?.status === "MENUNGGU" ? "KEDALUWARSA" : (current?.status ?? "GAGAL")));
    }

    for (const item of items) {
      const updated = await decrementStoreProductStock(item.store_product_id, item.quantity, order.id, client);
      if (!updated) {
        throw new Error(`Stok produk "${item.product_name}" tidak cukup`);
      }
    }

    const outLeg = await postLedgerEntry(client, {
      walletId: buyerWallet.id,
      type: "SALE_OUT",
      amount: order.total_amount,
      channel: "WEB",
      reference: order.id,
      createdBy: input.buyerUserId,
    });

    await postLedgerEntry(client, {
      walletId: storeWallet.id,
      type: "SALE_IN",
      amount: order.total_amount,
      channel: "WEB",
      reference: order.id,
      createdBy: input.buyerUserId,
    });

    const paidOrder = await markStoreOrderPaid(order.id, client);
    if (!paidOrder) {
      throw new Error("Gagal memperbarui status pesanan");
    }

    await recordAuditLog(
      {
        actor_user_id: input.buyerUserId,
        action: "STORE_PAYMENT_CONFIRMED",
        entity: "store_payment_requests",
        entity_id: claimed.id,
        new_value: { order_id: order.id, store_id: order.store_id, amount: order.total_amount },
      },
      client,
    );

    return { order: paidOrder, items, paymentRequest: claimed, buyerWalletAfter: outLeg.wallet };
  });
}
