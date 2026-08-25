import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto/credentials";
import { checkTransactionStatus } from "@/lib/midtrans/client";
import { getMidtransSettings, upsertMidtransSettings } from "@/repositories/midtrans.repository";
import type { MidtransMode } from "@/types/midtrans";

export interface MidtransSettingsView {
  mode: MidtransMode;
  merchant_id: string | null;
  is_active: boolean;
  sandbox_server_key_masked: string | null;
  sandbox_client_key_masked: string | null;
  production_server_key_masked: string | null;
  production_client_key_masked: string | null;
  updated_at: Date;
}

// The only shape this feature's API route is allowed to return — real key
// values never leave decryptSecret() below (same rule as Digiflazz's
// getDigiflazzSettingsForDisplay).
export async function getMidtransSettingsForDisplay(): Promise<MidtransSettingsView | null> {
  const row = await getMidtransSettings();
  if (!row) return null;

  return {
    mode: row.mode,
    merchant_id: row.merchant_id,
    is_active: row.is_active,
    sandbox_server_key_masked: row.sandbox_server_key_encrypted
      ? maskSecret(decryptSecret(row.sandbox_server_key_encrypted))
      : null,
    sandbox_client_key_masked: row.sandbox_client_key_encrypted
      ? maskSecret(decryptSecret(row.sandbox_client_key_encrypted))
      : null,
    production_server_key_masked: row.production_server_key_encrypted
      ? maskSecret(decryptSecret(row.production_server_key_encrypted))
      : null,
    production_client_key_masked: row.production_client_key_encrypted
      ? maskSecret(decryptSecret(row.production_client_key_encrypted))
      : null,
    updated_at: row.updated_at,
  };
}

export interface SaveMidtransSettingsInput {
  mode: MidtransMode;
  merchant_id?: string;
  /** Leave undefined/empty to keep the currently-stored key unchanged. */
  sandbox_server_key?: string;
  sandbox_client_key?: string;
  production_server_key?: string;
  production_client_key?: string;
}

export async function saveMidtransSettings(input: SaveMidtransSettingsInput): Promise<{ id: string }> {
  const row = await upsertMidtransSettings({
    mode: input.mode,
    merchant_id: input.merchant_id || null,
    sandbox_server_key_encrypted: input.sandbox_server_key ? encryptSecret(input.sandbox_server_key) : undefined,
    sandbox_client_key_encrypted: input.sandbox_client_key ? encryptSecret(input.sandbox_client_key) : undefined,
    production_server_key_encrypted: input.production_server_key
      ? encryptSecret(input.production_server_key)
      : undefined,
    production_client_key_encrypted: input.production_client_key
      ? encryptSecret(input.production_client_key)
      : undefined,
  });
  return { id: row.id };
}

export interface MidtransCredentials {
  mode: MidtransMode;
  merchantId: string | null;
  serverKey: string;
  clientKey: string | null;
}

// For the wallet-topup service / a future checkout page to call the real
// Midtrans API — returns decrypted keys for whichever mode is active.
// NEVER call this from a Route Handler that serializes the result into a
// response; it exists purely for server-to-server use.
export async function getActiveMidtransCredentials(): Promise<MidtransCredentials | null> {
  const row = await getMidtransSettings();
  if (!row || !row.is_active) return null;

  const serverKeyEncrypted = row.mode === "production" ? row.production_server_key_encrypted : row.sandbox_server_key_encrypted;
  const clientKeyEncrypted = row.mode === "production" ? row.production_client_key_encrypted : row.sandbox_client_key_encrypted;
  if (!serverKeyEncrypted) return null;

  return {
    mode: row.mode,
    merchantId: row.merchant_id,
    serverKey: decryptSecret(serverKeyEncrypted),
    clientKey: clientKeyEncrypted ? decryptSecret(clientKeyEncrypted) : null,
  };
}

export interface MidtransConnectionTestResult {
  success: boolean;
  message: string;
}

// Midtrans has no simple read-only "ping" endpoint like Digiflazz's
// price-list, so this checks the status of an order_id that will never
// exist: a wrong server key gets rejected before Midtrans even looks it
// up (status_code "401"), a correct one gets all the way to "the order
// doesn't exist" (status_code "404") — exactly the signal we want,
// without creating a real transaction just to test.
export async function testMidtransConnection(): Promise<MidtransConnectionTestResult> {
  const credentials = await getActiveMidtransCredentials();

  if (!credentials) {
    return {
      success: false,
      message: "Kredensial belum lengkap untuk mode yang aktif — simpan server key terlebih dahulu.",
    };
  }

  try {
    const result = await checkTransactionStatus(
      credentials.mode,
      credentials.serverKey,
      `digides-connection-test-${Date.now()}`,
    );

    if (result.status_code === "404") {
      return { success: true, message: `Koneksi berhasil (mode ${credentials.mode}).` };
    }
    if (result.status_code === "401") {
      return { success: false, message: "Server key ditolak Midtrans — periksa kembali key yang disimpan." };
    }
    return { success: false, message: result.status_message ?? "Respons Midtrans tidak terduga." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal terhubung ke Midtrans.",
    };
  }
}
