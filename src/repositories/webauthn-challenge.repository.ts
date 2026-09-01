import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";

export type WebauthnChallengePurpose = "REGISTRATION" | "TRANSACTION";

export interface WebauthnChallengeRow {
  id: string;
  user_id: string;
  challenge: string;
  purpose: WebauthnChallengePurpose;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

// A fresh row per ceremony, expiring in 2 minutes — long enough for a
// biometric prompt, short enough that a stale challenge is never worth
// trying to replay.
const CHALLENGE_TTL_MS = 2 * 60_000;

export async function createWebauthnChallenge(
  userId: string,
  challenge: string,
  purpose: WebauthnChallengePurpose,
  db: Queryable = pool,
): Promise<WebauthnChallengeRow> {
  const result = await db.query<WebauthnChallengeRow>(
    `INSERT INTO webauthn_challenges (user_id, challenge, purpose, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, challenge, purpose, new Date(Date.now() + CHALLENGE_TTL_MS)],
  );
  return result.rows[0];
}

// Atomically finds-and-marks-used in one statement — the only way two
// concurrent requests replaying the same challenge can't both succeed.
// Scoped to (user, purpose) so a registration challenge can never be
// spent completing a transaction ceremony or vice-versa.
export async function consumeWebauthnChallenge(
  userId: string,
  challenge: string,
  purpose: WebauthnChallengePurpose,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query(
    `UPDATE webauthn_challenges
     SET consumed_at = now()
     WHERE user_id = $1 AND challenge = $2 AND purpose = $3
       AND consumed_at IS NULL AND expires_at > now()`,
    [userId, challenge, purpose],
  );
  return (result.rowCount ?? 0) > 0;
}
