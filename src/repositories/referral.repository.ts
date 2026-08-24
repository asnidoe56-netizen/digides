import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { ReferralCode, ReferralRelationship } from "@/types/referral";

export async function createReferralCode(
  userId: string,
  code: string,
  expiresAt: Date | null = null,
  db: Queryable = pool,
): Promise<ReferralCode> {
  const result = await db.query<ReferralCode>(
    `INSERT INTO referral_codes (user_id, code, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, code, expiresAt],
  );
  return result.rows[0];
}

export async function findReferralCodeByCode(
  code: string,
  db: Queryable = pool,
): Promise<ReferralCode | null> {
  const result = await db.query<ReferralCode>(
    `SELECT * FROM referral_codes WHERE code = $1 AND is_active = true
       AND (expires_at IS NULL OR expires_at > now())`,
    [code],
  );
  return result.rows[0] ?? null;
}

export async function findRelationshipByReferredUser(
  referredId: string,
  db: Queryable = pool,
): Promise<ReferralRelationship | null> {
  const result = await db.query<ReferralRelationship>(
    `SELECT * FROM referral_relationships WHERE referred_id = $1`,
    [referredId],
  );
  return result.rows[0] ?? null;
}

// Self-referral is rejected by the DB CHECK constraint; a second parent for
// the same user is rejected by the UNIQUE constraint on referred_id — both
// surface here as a thrown error for the caller to translate into a user-
// facing message. PRD's "no parent change after first transaction" rule is
// enforced by the service layer (it must check the transactions table
// before ever calling this to *update* a relationship — this function only
// creates the initial one).
export async function createReferralRelationship(
  referrerId: string,
  referredId: string,
  db: Queryable = pool,
): Promise<ReferralRelationship> {
  const result = await db.query<ReferralRelationship>(
    `INSERT INTO referral_relationships (referrer_id, referred_id, level)
     VALUES ($1, $2, 1)
     RETURNING *`,
    [referrerId, referredId],
  );
  return result.rows[0];
}

export interface ReferrerChainEntry {
  user_id: string;
  depth: number;
}

// Walks referrer_id upward from `userId` up to `maxLevel` hops — this is
// how the commission engine finds "level 2", "level 3" beneficiaries
// without ever storing a stale level number. depth 1 = direct referrer.
export async function findReferrerChain(
  userId: string,
  maxLevel: number,
  db: Queryable = pool,
): Promise<ReferrerChainEntry[]> {
  const result = await db.query<ReferrerChainEntry>(
    `WITH RECURSIVE chain AS (
       SELECT referrer_id AS user_id, 1 AS depth
       FROM referral_relationships
       WHERE referred_id = $1 AND status = 'ACTIVE'
       UNION ALL
       SELECT rr.referrer_id, chain.depth + 1
       FROM referral_relationships rr
       JOIN chain ON rr.referred_id = chain.user_id
       WHERE rr.status = 'ACTIVE' AND chain.depth < $2
     )
     SELECT user_id, depth FROM chain ORDER BY depth ASC`,
    [userId, maxLevel],
  );
  return result.rows;
}
