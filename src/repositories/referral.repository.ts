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

export async function findReferralCodeByUserId(userId: string, db: Queryable = pool): Promise<ReferralCode | null> {
  const result = await db.query<ReferralCode>(`SELECT * FROM referral_codes WHERE user_id = $1`, [userId]);
  return result.rows[0] ?? null;
}

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}

// Retries with a fresh random code on the rare collision — `code` is
// UNIQUE, and generateReferralCode's caller (referral.service.ts) never
// calls this for a user who already has one (user_id is UNIQUE too).
export async function insertReferralCodeWithRetry(
  userId: string,
  makeCode: () => string,
  db: Queryable = pool,
  attemptsLeft = 5,
): Promise<ReferralCode> {
  try {
    return await createReferralCode(userId, makeCode(), null, db);
  } catch (error) {
    if (isUniqueViolation(error) && attemptsLeft > 1) {
      return insertReferralCodeWithRetry(userId, makeCode, db, attemptsLeft - 1);
    }
    throw error;
  }
}

export async function setReferralCodeActive(
  id: string,
  isActive: boolean,
  db: Queryable = pool,
): Promise<ReferralCode | null> {
  const result = await db.query<ReferralCode>(
    `UPDATE referral_codes SET is_active = $2 WHERE id = $1 RETURNING *`,
    [id, isActive],
  );
  return result.rows[0] ?? null;
}

export interface ReferralCodeWithDetail extends ReferralCode {
  owner_name: string;
  owner_email: string;
  referred_count: number;
}

// The Referral menu's Kode tab — one row per code with its owner and how
// many people it has actually referred (referral_relationships counts by
// referrer_id, not by code, since a code can be reused indefinitely).
export async function listReferralCodes(db: Queryable = pool): Promise<ReferralCodeWithDetail[]> {
  const result = await db.query<ReferralCodeWithDetail>(
    `SELECT
       rc.*,
       u.full_name AS owner_name,
       u.email AS owner_email,
       COALESCE((SELECT COUNT(*) FROM referral_relationships rr WHERE rr.referrer_id = rc.user_id), 0)::int AS referred_count
     FROM referral_codes rc
     JOIN users u ON u.id = rc.user_id
     ORDER BY rc.created_at DESC`,
  );
  return result.rows;
}

export interface ReferralRelationshipWithDetail extends ReferralRelationship {
  referrer_name: string;
  referrer_email: string;
  referred_name: string;
  referred_email: string;
}

// The Referral menu's Relasi tab — every edge in the referral forest with
// both endpoints' names, so an admin can audit who referred whom without
// cross-referencing user ids by hand.
export async function listReferralRelationships(db: Queryable = pool): Promise<ReferralRelationshipWithDetail[]> {
  const result = await db.query<ReferralRelationshipWithDetail>(
    `SELECT
       rr.*,
       ref.full_name AS referrer_name,
       ref.email AS referrer_email,
       red.full_name AS referred_name,
       red.email AS referred_email
     FROM referral_relationships rr
     JOIN users ref ON ref.id = rr.referrer_id
     JOIN users red ON red.id = rr.referred_id
     ORDER BY rr.created_at DESC`,
  );
  return result.rows;
}

export async function setReferralRelationshipStatus(
  id: string,
  status: "ACTIVE" | "BLOCKED",
  db: Queryable = pool,
): Promise<ReferralRelationship | null> {
  const result = await db.query<ReferralRelationship>(
    `UPDATE referral_relationships SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return result.rows[0] ?? null;
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

export interface DirectDownline {
  relationship_id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: ReferralRelationship["status"];
  joined_at: Date;
  /** A user normally has exactly one role, but the schema allows more —
   *  same aggregation as user.repository.ts's listUsers(). */
  roles: string[];
}

// The Menu Mitra's downline list — every user this one directly referred
// (level 1 only, not the whole sub-tree), with their role so the caller
// can resolve which entity (bumdes/konter/plain user) owns their wallet.
export async function listDirectDownlines(referrerId: string, db: Queryable = pool): Promise<DirectDownline[]> {
  const result = await db.query<DirectDownline>(
    `SELECT
       rr.id AS relationship_id,
       u.id AS user_id,
       u.full_name,
       u.email,
       rr.status,
       rr.created_at AS joined_at,
       COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles
     FROM referral_relationships rr
     JOIN users u ON u.id = rr.referred_id
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE rr.referrer_id = $1
     GROUP BY rr.id, u.id, u.full_name, u.email, rr.status, rr.created_at
     ORDER BY rr.created_at DESC`,
    [referrerId],
  );
  return result.rows;
}

export interface ReferrerChainEntry {
  /** The referral_relationships row this hop came from — commission_ledger.referral_relationship_id points here. */
  relationship_id: string;
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
       SELECT id AS relationship_id, referrer_id AS user_id, 1 AS depth
       FROM referral_relationships
       WHERE referred_id = $1 AND status = 'ACTIVE'
       UNION ALL
       SELECT rr.id, rr.referrer_id, chain.depth + 1
       FROM referral_relationships rr
       JOIN chain ON rr.referred_id = chain.user_id
       WHERE rr.status = 'ACTIVE' AND chain.depth < $2
     )
     SELECT relationship_id, user_id, depth FROM chain ORDER BY depth ASC`,
    [userId, maxLevel],
  );
  return result.rows;
}
