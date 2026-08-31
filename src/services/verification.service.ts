import { randomUUID } from "crypto";
import { submitDigiflazzTransaction, type DigiflazzTransactionResult } from "@/lib/digiflazz/transaction";
import { findProductById } from "@/repositories/product.repository";
import { recordAuditLog } from "@/repositories/audit.repository";
import { getActiveDigiflazzCredentials } from "@/services/digiflazz.service";
import { isNameVerificationProduct } from "@/services/catalog.service";

export interface NameVerificationResult {
  registeredName: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A real purchase left "Pending" just sits as RESERVED until a later
// manual/automated re-check or webhook resolves it (transaction.service.ts)
// — fine for a purchase already confirmed with a PIN, since the mitra has
// moved on to the result screen either way. A verification call has no
// such row to come back to and no webhook ref_id to correlate against
// (this ref_id is ephemeral, generated fresh per check, never persisted),
// and the mitra is actively watching this one screen waiting for an
// answer — so instead of surfacing "Pending" as a dead end, poll Digiflazz
// a few times with the SAME ref_id (their documented way to re-check a
// pending transaction's status) before giving up.
const POLL_ATTEMPTS = 4;
const POLL_DELAY_MS = 2000;

// E-Money's "Verifikasi Pengguna" — checks a customer_no against the
// selected brand's "Cek Nama Pengguna <Brand>" Digiflazz SKU and returns
// the registered account holder's name, so a mitra can confirm they've
// got the right person before paying for a real top-up.
//
// Deliberately NOT routed through transaction.service.ts's
// executeTransaction: a lookup has no PIN, no wallet reservation, no
// `transactions`/`wallet_ledger` row at all — it's a read, not a
// purchase. It still has to go through Digiflazz's own /transaction
// endpoint (that's the only endpoint that resolves a Cek Nama SKU), just
// with its own ephemeral ref_id, never `transactions.idempotency_key`.
export async function verifyCustomerName(
  productId: string,
  customerNumber: string,
  actorUserId: string,
): Promise<NameVerificationResult> {
  const product = await findProductById(productId);
  if (!product) {
    throw new Error("Produk verifikasi tidak ditemukan.");
  }
  if (!isNameVerificationProduct(product)) {
    throw new Error("Produk ini bukan produk verifikasi nama pengguna.");
  }

  const credentials = await getActiveDigiflazzCredentials();
  if (!credentials) {
    throw new Error("Digiflazz belum dikonfigurasi.");
  }

  const refId = randomUUID();
  const submitOnce = () =>
    submitDigiflazzTransaction({
      baseUrl: credentials.baseUrl,
      username: credentials.username,
      apiKey: credentials.apiKey,
      buyerSkuCode: product.sku,
      customerNo: customerNumber,
      refId,
      testing: credentials.mode === "development",
    });

  let result: DigiflazzTransactionResult = await submitOnce();
  for (let attempt = 1; result.status === "Pending" && attempt < POLL_ATTEMPTS; attempt += 1) {
    await delay(POLL_DELAY_MS);
    result = await submitOnce();
  }

  // Best-effort trail of who checked which number, not a money-movement
  // record — no transaction/ledger row exists for this to attach to.
  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "EMONEY_NAME_VERIFIED",
    entity: "products",
    entity_id: product.id,
    new_value: { customer_number: customerNumber, status: result.status, message: result.message },
  });

  if (result.status === "Pending") {
    throw new Error("Verifikasi masih diproses provider. Coba cek lagi dalam beberapa saat.");
  }
  if (result.status !== "Sukses" || !result.sn) {
    throw new Error(result.message || "Nomor tidak terdaftar pada provider ini.");
  }

  return { registeredName: result.sn };
}
