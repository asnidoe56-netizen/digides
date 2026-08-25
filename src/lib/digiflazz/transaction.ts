import { createHash } from "crypto";

// Digiflazz's transaction endpoint. Signature formula is fixed per their
// docs and differs from price-list's: md5(username + apiKey + ref_id) —
// `ref_id` is Digiflazz's own idempotency key, so we always pass our own
// `transactions.idempotency_key` as ref_id. Re-submitting the SAME ref_id
// doesn't create a second purchase; Digiflazz just returns the current
// status of the original one — that's how checkDigiflazzTransactionStatus
// below works, with no separate "status" endpoint needed.
function buildTransactionSignature(username: string, apiKey: string, refId: string): string {
  return createHash("md5").update(`${username}${apiKey}${refId}`).digest("hex");
}

export type DigiflazzTransactionStatus = "Pending" | "Sukses" | "Gagal";

export interface DigiflazzTransactionResult {
  ref_id: string;
  customer_no: string;
  buyer_sku_code: string;
  message: string;
  status: DigiflazzTransactionStatus;
  rc: string;
  sn?: string;
  buyer_last_saldo?: number;
  price?: number;
}

interface DigiflazzTransactionResponse {
  data?: DigiflazzTransactionResult;
}

export interface SubmitDigiflazzTransactionParams {
  baseUrl: string;
  username: string;
  apiKey: string;
  buyerSkuCode: string;
  customerNo: string;
  /** Our transactions.idempotency_key, reused as Digiflazz's own ref_id. */
  refId: string;
  /**
   * Digiflazz's own flag for deliberately forcing a transaction to stay
   * "Pending" forever, meant only for testing how an integrator's pending-
   * state handling behaves — NOT how dev vs. production mode is selected
   * (that's purely which API key signs the request). Leave false/omitted
   * for a normal purchase, dev-mode included, so it resolves like a real one.
   */
  testing?: boolean;
}

// Submits a purchase — or, called again with a ref_id already in flight,
// checks its current status. Same request shape either way, per Digiflazz's
// own idempotency model.
export async function submitDigiflazzTransaction(
  params: SubmitDigiflazzTransactionParams,
): Promise<DigiflazzTransactionResult> {
  const sign = buildTransactionSignature(params.username, params.apiKey, params.refId);

  const response = await fetch(`${params.baseUrl.replace(/\/+$/, "")}/transaction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: params.username,
      buyer_sku_code: params.buyerSkuCode,
      customer_no: params.customerNo,
      ref_id: params.refId,
      sign,
      ...(params.testing ? { testing: true } : {}),
    }),
  });

  const rawBody = (await response.json().catch(() => null)) as DigiflazzTransactionResponse | null;
  const data = rawBody?.data;

  if (!data) {
    throw new Error(`Format respons Digiflazz tidak sesuai (HTTP ${response.status})`);
  }

  return data;
}
