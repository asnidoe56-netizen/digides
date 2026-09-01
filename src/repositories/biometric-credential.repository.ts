import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { BiometricCredential, BiometricCredentialSummary } from "@/types/biometric";

export interface CreateBiometricCredentialInput {
  user_id: string;
  credential_id: string;
  public_key: Buffer;
  counter: number;
  device_label: string;
  transports: string[] | null;
}

export async function createBiometricCredential(
  input: CreateBiometricCredentialInput,
  db: Queryable = pool,
): Promise<BiometricCredential> {
  const result = await db.query<BiometricCredential>(
    `INSERT INTO user_biometric_credentials (user_id, credential_id, public_key, counter, device_label, transports)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [input.user_id, input.credential_id, input.public_key, input.counter, input.device_label, input.transports],
  );
  return result.rows[0];
}

// Looked up by the opaque credential_id the browser reports back at
// authentication time — never scoped to a user up front, since the
// assertion response itself is the only thing that says which credential
// (and therefore which user) is authenticating.
export async function findBiometricCredentialByCredentialId(
  credentialId: string,
  db: Queryable = pool,
): Promise<BiometricCredential | null> {
  const result = await db.query<BiometricCredential>(
    `SELECT * FROM user_biometric_credentials WHERE credential_id = $1 AND revoked_at IS NULL`,
    [credentialId],
  );
  return result.rows[0] ?? null;
}

// Akun > Keamanan's device list, and the `allowCredentials` hint passed
// into a transaction's WebAuthn authentication options — both need the
// same "this account's currently-active credentials" set.
export async function listActiveBiometricCredentials(
  userId: string,
  db: Queryable = pool,
): Promise<BiometricCredential[]> {
  const result = await db.query<BiometricCredential>(
    `SELECT * FROM user_biometric_credentials WHERE user_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function listBiometricCredentialSummaries(
  userId: string,
  db: Queryable = pool,
): Promise<BiometricCredentialSummary[]> {
  const result = await db.query<BiometricCredentialSummary>(
    `SELECT id, device_label, created_at, last_used_at
     FROM user_biometric_credentials WHERE user_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

// A successful authentication both bumps the signature counter (WebAuthn's
// clone-detection mechanism — see biometric.service.ts's
// verifyTransactionBiometric) and records last_used_at, always together,
// so one query covers both instead of two separate writes per assertion.
export async function touchBiometricCredentialUsage(
  id: string,
  counter: number,
  db: Queryable = pool,
): Promise<void> {
  await db.query(`UPDATE user_biometric_credentials SET counter = $2, last_used_at = now() WHERE id = $1`, [
    id,
    counter,
  ]);
}

// Scoped to the owning user — a mitra can only ever revoke their own
// device, never one belonging to someone else, even by guessing an id.
export async function revokeBiometricCredential(
  id: string,
  userId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query(
    `UPDATE user_biometric_credentials SET revoked_at = now() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}
