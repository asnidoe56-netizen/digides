import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { MidtransSettings } from "@/types/midtrans";

// Singleton row, same convention as digiflazz_settings.
export async function getMidtransSettings(db: Queryable = pool): Promise<MidtransSettings | null> {
  const result = await db.query<MidtransSettings>(`SELECT * FROM midtrans_settings ORDER BY updated_at DESC LIMIT 1`);
  return result.rows[0] ?? null;
}

export interface UpsertMidtransSettingsInput {
  mode: MidtransSettings["mode"];
  merchant_id: string | null;
  /** Omit to leave the currently-stored encrypted key untouched. */
  sandbox_server_key_encrypted?: string;
  sandbox_client_key_encrypted?: string;
  production_server_key_encrypted?: string;
  production_client_key_encrypted?: string;
}

export async function upsertMidtransSettings(
  input: UpsertMidtransSettingsInput,
  db: Queryable = pool,
): Promise<MidtransSettings> {
  const existing = await getMidtransSettings(db);

  if (!existing) {
    const result = await db.query<MidtransSettings>(
      `INSERT INTO midtrans_settings (
         mode, merchant_id, sandbox_server_key_encrypted, sandbox_client_key_encrypted,
         production_server_key_encrypted, production_client_key_encrypted, is_active
       ) VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [
        input.mode,
        input.merchant_id,
        input.sandbox_server_key_encrypted ?? null,
        input.sandbox_client_key_encrypted ?? null,
        input.production_server_key_encrypted ?? null,
        input.production_client_key_encrypted ?? null,
      ],
    );
    return result.rows[0];
  }

  const result = await db.query<MidtransSettings>(
    `UPDATE midtrans_settings
     SET mode = $2,
         merchant_id = $3,
         sandbox_server_key_encrypted = COALESCE($4, sandbox_server_key_encrypted),
         sandbox_client_key_encrypted = COALESCE($5, sandbox_client_key_encrypted),
         production_server_key_encrypted = COALESCE($6, production_server_key_encrypted),
         production_client_key_encrypted = COALESCE($7, production_client_key_encrypted)
     WHERE id = $1
     RETURNING *`,
    [
      existing.id,
      input.mode,
      input.merchant_id,
      input.sandbox_server_key_encrypted ?? null,
      input.sandbox_client_key_encrypted ?? null,
      input.production_server_key_encrypted ?? null,
      input.production_client_key_encrypted ?? null,
    ],
  );
  return result.rows[0];
}
