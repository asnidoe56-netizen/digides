import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { SecurityPolicy } from "@/types/security";

// Singleton settings row (same shape/reasoning as midtrans_settings /
// digiflazz_settings) — seeded by migration 021_security.sql's
// `INSERT INTO security_policies DEFAULT VALUES`, so exactly one row
// always exists and this never needs an upsert.
export async function getSecurityPolicy(db: Queryable = pool): Promise<SecurityPolicy> {
  const result = await db.query<SecurityPolicy>(`SELECT * FROM security_policies LIMIT 1`);
  return result.rows[0];
}

export interface UpdateSecurityPolicyInput {
  max_devices_per_user: number;
  max_login_attempts: number;
  login_lockout_minutes: number;
  require_device_verification: boolean;
  session_timeout_minutes: number;
  max_pin_attempts: number;
  pin_lockout_minutes: number;
}

export async function updateSecurityPolicy(
  id: string,
  input: UpdateSecurityPolicyInput,
  actorUserId: string,
  db: Queryable = pool,
): Promise<SecurityPolicy> {
  const result = await db.query<SecurityPolicy>(
    `UPDATE security_policies
     SET max_devices_per_user = $2, max_login_attempts = $3, login_lockout_minutes = $4,
         require_device_verification = $5, session_timeout_minutes = $6,
         max_pin_attempts = $7, pin_lockout_minutes = $8, updated_by = $9
     WHERE id = $1 RETURNING *`,
    [
      id,
      input.max_devices_per_user,
      input.max_login_attempts,
      input.login_lockout_minutes,
      input.require_device_verification,
      input.session_timeout_minutes,
      input.max_pin_attempts,
      input.pin_lockout_minutes,
      actorUserId,
    ],
  );
  return result.rows[0];
}
