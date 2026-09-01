import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type {
  MobileBiometricAlgorithm,
  MobileBiometricCredential,
  MobileBiometricCredentialSummary,
  MobileBiometricPlatform,
} from "@/types/mobile-biometric";

export interface CreateMobileBiometricCredentialInput {
  user_id: string;
  credential_id: string;
  public_key: string;
  algorithm: MobileBiometricAlgorithm;
  platform: MobileBiometricPlatform;
  device_label: string;
}

export async function createMobileBiometricCredential(
  input: CreateMobileBiometricCredentialInput,
  db: Queryable = pool,
): Promise<MobileBiometricCredential> {
  const result = await db.query<MobileBiometricCredential>(
    `INSERT INTO user_mobile_biometric_credentials
       (user_id, credential_id, public_key, algorithm, platform, device_label)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.user_id, input.credential_id, input.public_key, input.algorithm, input.platform, input.device_label],
  );
  return result.rows[0];
}

// Scoped to the claimed owner up front (unlike the WebAuthn table's
// by-credential-only lookup) — the Flutter app always sends its own
// session alongside the credentialId, so there is no reason to defer the
// ownership check to a separate comparison the way verifyTransactionBiometric
// does for WebAuthn's user-agnostic credential.id lookup.
export async function findMobileBiometricCredential(
  userId: string,
  credentialId: string,
  db: Queryable = pool,
): Promise<MobileBiometricCredential | null> {
  const result = await db.query<MobileBiometricCredential>(
    `SELECT * FROM user_mobile_biometric_credentials
     WHERE user_id = $1 AND credential_id = $2 AND revoked_at IS NULL`,
    [userId, credentialId],
  );
  return result.rows[0] ?? null;
}

export async function listActiveMobileBiometricCredentials(
  userId: string,
  db: Queryable = pool,
): Promise<MobileBiometricCredential[]> {
  const result = await db.query<MobileBiometricCredential>(
    `SELECT * FROM user_mobile_biometric_credentials WHERE user_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function listMobileBiometricCredentialSummaries(
  userId: string,
  db: Queryable = pool,
): Promise<MobileBiometricCredentialSummary[]> {
  const result = await db.query<MobileBiometricCredentialSummary>(
    `SELECT id, credential_id, platform, device_label, created_at, last_used_at
     FROM user_mobile_biometric_credentials WHERE user_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function touchMobileBiometricCredentialUsage(id: string, db: Queryable = pool): Promise<void> {
  await db.query(`UPDATE user_mobile_biometric_credentials SET last_used_at = now() WHERE id = $1`, [id]);
}

export async function revokeMobileBiometricCredential(
  id: string,
  userId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query(
    `UPDATE user_mobile_biometric_credentials SET revoked_at = now() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
