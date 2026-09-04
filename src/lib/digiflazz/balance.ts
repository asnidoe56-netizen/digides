import { createHash } from "crypto";

// Digiflazz's balance-check endpoint. Signature formula is fixed per their
// docs: md5(username + apiKey + "depo") — distinct from both price-list's
// ("pricelist") and transaction's (ref_id) formulas.
function buildBalanceSignature(username: string, apiKey: string): string {
  return createHash("md5").update(`${username}${apiKey}depo`).digest("hex");
}

export interface FetchDigiflazzBalanceParams {
  baseUrl: string;
  username: string;
  apiKey: string;
}

interface DigiflazzBalanceSuccess {
  data?: { deposit?: number };
}

interface DigiflazzErrorBody {
  data?: { rc?: string; message?: string };
}

// Same "everything comes back wrapped in `data`" shape as price-list.ts —
// on success `data.deposit` is the current saldo, on failure (bad
// signature, inactive account, ...) `data` is instead `{ rc, message }`.
export async function fetchDigiflazzBalance(params: FetchDigiflazzBalanceParams): Promise<number> {
  const sign = buildBalanceSignature(params.username, params.apiKey);

  const response = await fetch(`${params.baseUrl.replace(/\/+$/, "")}/cek-saldo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd: "deposit", username: params.username, sign }),
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

  const body = rawBody as DigiflazzBalanceSuccess | null;
  const deposit = body?.data?.deposit;

  if (typeof deposit !== "number") {
    const errorBody = rawBody as DigiflazzErrorBody | null;
    const digiflazzMessage = errorBody?.data?.message;
    throw new Error(
      digiflazzMessage
        ? `Digiflazz menolak permintaan: ${digiflazzMessage}`
        : "Format respons Digiflazz tidak sesuai (saldo tidak ditemukan)",
    );
  }

  return deposit;
}
