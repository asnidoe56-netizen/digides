import {
  getDigiflazzSettings,
  upsertDigiflazzSettings,
} from "@/repositories/product.repository";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/digiflazz/credentials";
import { fetchDigiflazzPriceList } from "@/lib/digiflazz/price-list";
import type { DigiflazzMode } from "@/types/product";

export interface DigiflazzSettingsView {
  username: string;
  base_url: string;
  mode: DigiflazzMode;
  is_active: boolean;
  dev_key_masked: string | null;
  prod_key_masked: string | null;
  updated_at: Date;
}

// The only shape this feature's API route is allowed to return — real key
// values never leave decryptSecret() below.
export async function getDigiflazzSettingsForDisplay(): Promise<DigiflazzSettingsView | null> {
  const row = await getDigiflazzSettings();
  if (!row) return null;

  return {
    username: row.username,
    base_url: row.base_url,
    mode: row.mode,
    is_active: row.is_active,
    dev_key_masked: row.dev_key_encrypted ? maskSecret(decryptSecret(row.dev_key_encrypted)) : null,
    prod_key_masked: row.prod_key_encrypted ? maskSecret(decryptSecret(row.prod_key_encrypted)) : null,
    updated_at: row.updated_at,
  };
}

export interface SaveDigiflazzSettingsInput {
  username: string;
  base_url: string;
  mode: DigiflazzMode;
  /** Leave undefined/empty to keep the currently-stored key unchanged. */
  dev_key?: string;
  /** Leave undefined/empty to keep the currently-stored key unchanged. */
  prod_key?: string;
}

export async function saveDigiflazzSettings(input: SaveDigiflazzSettingsInput): Promise<{ id: string }> {
  const row = await upsertDigiflazzSettings({
    username: input.username,
    base_url: input.base_url,
    mode: input.mode,
    dev_key_encrypted: input.dev_key ? encryptSecret(input.dev_key) : undefined,
    prod_key_encrypted: input.prod_key ? encryptSecret(input.prod_key) : undefined,
  });
  return { id: row.id };
}

export interface DigiflazzCredentials {
  username: string;
  apiKey: string;
  baseUrl: string;
  mode: DigiflazzMode;
}

// For the future transaction engine to call the real Digiflazz API —
// returns the decrypted key for whichever mode is currently active.
// NEVER call this from a Route Handler that serializes the result into a
// response; it exists purely for server-to-server use.
export async function getActiveDigiflazzCredentials(): Promise<DigiflazzCredentials | null> {
  const row = await getDigiflazzSettings();
  if (!row || !row.is_active) return null;

  const encryptedKey = row.mode === "production" ? row.prod_key_encrypted : row.dev_key_encrypted;
  if (!encryptedKey) return null;

  return {
    username: row.username,
    apiKey: decryptSecret(encryptedKey),
    baseUrl: row.base_url,
    mode: row.mode,
  };
}

export interface DigiflazzConnectionTestResult {
  success: boolean;
  message: string;
  productCount?: number;
}

// Calls Digiflazz's real price-list endpoint with whatever credentials are
// currently saved (never whatever's typed in the form but not yet saved —
// save first, then test) so an admin knows immediately whether a
// username/key pair actually works, without waiting for the catalog-sync
// job to run.
export async function testDigiflazzConnection(): Promise<DigiflazzConnectionTestResult> {
  const credentials = await getActiveDigiflazzCredentials();

  if (!credentials) {
    return {
      success: false,
      message: "Kredensial belum lengkap untuk mode yang aktif — simpan username dan API key terlebih dahulu.",
    };
  }

  try {
    const items = await fetchDigiflazzPriceList({
      baseUrl: credentials.baseUrl,
      username: credentials.username,
      apiKey: credentials.apiKey,
      cmd: "prepaid",
    });

    return {
      success: true,
      message: `Koneksi berhasil (mode ${credentials.mode}). ${items.length} produk prepaid ditemukan.`,
      productCount: items.length,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal terhubung ke Digiflazz.",
    };
  }
}
