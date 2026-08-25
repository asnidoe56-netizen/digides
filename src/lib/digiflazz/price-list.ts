import { createHash } from "crypto";

// Digiflazz's price-list endpoint. Signature formula is fixed per their
// docs: md5(username + apiKey + "pricelist") — same for both prepaid and
// pasca (postpaid), and unrelated to which cmd is requested.
function buildPriceListSignature(username: string, apiKey: string): string {
  return createHash("md5").update(`${username}${apiKey}pricelist`).digest("hex");
}

export interface DigiflazzPrepaidPriceListItem {
  product_name: string;
  category: string;
  brand: string;
  type: string;
  seller_name: string;
  price: number;
  buyer_sku_code: string;
  buyer_product_status: boolean;
  seller_product_status: boolean;
  unlimited_stock: boolean;
  stock: number;
  multi: boolean;
  start_cut_off: string;
  end_cut_off: string;
  desc: string;
}

export interface DigiflazzPascaPriceListItem {
  product_name: string;
  category: string;
  brand: string;
  seller_name: string;
  admin: number;
  commission: number;
  buyer_sku_code: string;
  buyer_product_status: boolean;
  seller_product_status: boolean;
  desc: string;
}

export interface FetchPriceListParams {
  baseUrl: string;
  username: string;
  apiKey: string;
  cmd: "prepaid" | "pasca";
  /** Buyer's own product code — optional filter per Digiflazz docs. */
  code?: string;
  /** Prepaid only. */
  category?: string;
  brand?: string;
  /** Prepaid only. */
  type?: string;
}

// Digiflazz wraps every response in a top-level `data` field — see
// "Perhatian: Response JSON akan di bungkus oleh variable data" in their
// docs. On success `data` is the price-list array; on failure (bad
// signature, bad username, etc.) it's instead an object like
// { rc: "42", message: "Gagal memproses API Buyer" } — still HTTP 400, so
// both shapes need handling.
interface DigiflazzPriceListSuccess<T> {
  data: T[];
}

interface DigiflazzErrorBody {
  data?: { rc?: string; message?: string };
}

export async function fetchDigiflazzPriceList<
  T = DigiflazzPrepaidPriceListItem | DigiflazzPascaPriceListItem,
>(params: FetchPriceListParams): Promise<T[]> {
  const sign = buildPriceListSignature(params.username, params.apiKey);

  const response = await fetch(`${params.baseUrl.replace(/\/+$/, "")}/price-list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cmd: params.cmd,
      username: params.username,
      sign,
      ...(params.code ? { code: params.code } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.brand ? { brand: params.brand } : {}),
      ...(params.type ? { type: params.type } : {}),
    }),
  });

  const rawBody = await response.json().catch(() => null);

  if (!response.ok) {
    const errorBody = rawBody as DigiflazzErrorBody | null;
    const digiflazzMessage = errorBody?.data?.message;
    throw new Error(
      digiflazzMessage
        ? `Digiflazz menolak permintaan: ${digiflazzMessage}`
        : `Digiflazz merespons dengan status ${response.status}`,
    );
  }

  const body = rawBody as DigiflazzPriceListSuccess<T> | null;

  if (!body || !Array.isArray(body.data)) {
    // Digiflazz sometimes returns the error shape { rc, message } with a
    // 2xx status too (e.g. rc "83" for hitting their price-list rate
    // limit) — not just alongside a non-ok HTTP status. Surface their
    // actual message here as well, instead of a generic "malformed
    // response" that hides what really happened.
    const errorBody = rawBody as DigiflazzErrorBody | null;
    const digiflazzMessage = errorBody?.data?.message;
    throw new Error(
      digiflazzMessage
        ? `Digiflazz menolak permintaan: ${digiflazzMessage}`
        : "Format respons Digiflazz tidak sesuai (data tidak ditemukan)",
    );
  }

  return body.data;
}
