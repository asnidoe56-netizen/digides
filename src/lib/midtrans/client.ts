import { createHash } from "crypto";

// Midtrans's two fixed API hosts per environment — unlike Digiflazz's
// admin-configurable base_url, these never change and aren't something an
// admin should be typing in, so they're constants here rather than a
// midtrans_settings column.
const SNAP_BASE_URL = {
  sandbox: "https://app.sandbox.midtrans.com/snap/v1",
  production: "https://app.midtrans.com/snap/v1",
} as const;

const CORE_API_BASE_URL = {
  sandbox: "https://api.sandbox.midtrans.com/v2",
  production: "https://api.midtrans.com/v2",
} as const;

export type MidtransMode = "sandbox" | "production";

function basicAuthHeader(serverKey: string): string {
  return `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
}

export interface CreateSnapTransactionParams {
  mode: MidtransMode;
  serverKey: string;
  orderId: string;
  grossAmount: number;
  customerDetails?: { first_name?: string; email?: string; phone?: string };
}

export interface SnapTransactionResult {
  token: string;
  redirect_url: string;
}

// Creates a Snap payment page/token for a top-up — the redirect_url is
// what a future checkout page sends the user to. No UI calls this yet
// (no self-service top-up page exists), but it's the real, complete
// client a future one will use, not a stub.
export async function createSnapTransaction(params: CreateSnapTransactionParams): Promise<SnapTransactionResult> {
  const response = await fetch(`${SNAP_BASE_URL[params.mode]}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: basicAuthHeader(params.serverKey),
    },
    body: JSON.stringify({
      transaction_details: { order_id: params.orderId, gross_amount: params.grossAmount },
      ...(params.customerDetails ? { customer_details: params.customerDetails } : {}),
    }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.token) {
    const message = body?.error_messages?.join(", ") ?? `Midtrans merespons dengan status ${response.status}`;
    throw new Error(`Gagal membuat transaksi Midtrans: ${message}`);
  }

  return { token: body.token, redirect_url: body.redirect_url };
}

export interface MidtransStatusResult {
  status_code: string;
  status_message: string;
  transaction_status?: string;
}

// Used only to verify a server key actually authenticates (testMidtransConnection)
// — checking the status of a random order_id that will never exist. A
// wrong key gets rejected before Midtrans even looks the order up
// (status_code "401"); a correct key gets all the way to "the order
// doesn't exist" (status_code "404") — which is exactly the outcome we
// want, since we don't want to create a real transaction just to test.
export async function checkTransactionStatus(
  mode: MidtransMode,
  serverKey: string,
  orderId: string,
): Promise<MidtransStatusResult> {
  const response = await fetch(`${CORE_API_BASE_URL[mode]}/${encodeURIComponent(orderId)}/status`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: basicAuthHeader(serverKey) },
  });
  const body = await response.json().catch(() => null);
  if (!body?.status_code) {
    throw new Error(`Format respons Midtrans tidak sesuai (HTTP ${response.status})`);
  }
  return body;
}

// Midtrans's documented webhook signature formula:
// sha512(order_id + status_code + gross_amount + server_key). Verifying
// this is what lets /api/webhooks/midtrans trust a notification actually
// came from Midtrans and not a forged request.
export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
  signatureKey: string;
}): boolean {
  const expected = createHash("sha512")
    .update(`${params.orderId}${params.statusCode}${params.grossAmount}${params.serverKey}`)
    .digest("hex");
  return expected === params.signatureKey;
}
