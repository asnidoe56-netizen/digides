import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { SupportSettings } from "@/types/support-settings";

// Singleton settings row (same shape/reasoning as security_policies /
// midtrans_settings) — seeded by migration 032_support_settings.sql, so
// exactly one row always exists and this never needs an upsert.
export async function getSupportSettings(db: Queryable = pool): Promise<SupportSettings> {
  const result = await db.query<SupportSettings>(`SELECT * FROM support_settings LIMIT 1`);
  return result.rows[0];
}

export async function updateSupportSettings(
  id: string,
  whatsappNumber: string,
  actorUserId: string,
  db: Queryable = pool,
): Promise<SupportSettings> {
  const result = await db.query<SupportSettings>(
    `UPDATE support_settings SET whatsapp_number = $2, updated_by = $3 WHERE id = $1 RETURNING *`,
    [id, whatsappNumber, actorUserId],
  );
  return result.rows[0];
}
