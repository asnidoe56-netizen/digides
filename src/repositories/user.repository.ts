import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { PublicUserProfile, Role, RoleCode, User, UserStatus } from "@/types/user";
import type { PinStatus, UserTransactionPin, UserTransactionPinForVerification } from "@/types/auth";

// The one place a full `User` row (password_hash, locked_until, etc.) gets
// narrowed down to what's safe to send across an API response or into a
// Client Component prop — see security audit SEC-01. Call this instead of
// passing/returning a `User` row directly anywhere it crosses that boundary.
export function toPublicUserProfile(user: User): PublicUserProfile {
  return { id: user.id, email: user.email, full_name: user.full_name, phone: user.phone };
}

export interface CreateUserInput {
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string | null;
  /** Only set for self-registration (POST /api/auth/register), which is
   *  gated on agreeing to the Syarat & Ketentuan — left null for accounts
   *  an admin provisions directly (registerMitra), which has no consent
   *  screen of its own. */
  terms_accepted_at?: Date | null;
  terms_version?: string | null;
}

export async function createUser(input: CreateUserInput, db: Queryable = pool): Promise<User> {
  const result = await db.query<User>(
    `INSERT INTO users (email, password_hash, full_name, phone, terms_accepted_at, terms_version)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.email,
      input.password_hash,
      input.full_name,
      input.phone ?? null,
      input.terms_accepted_at ?? null,
      input.terms_version ?? null,
    ],
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string, db: Queryable = pool): Promise<User | null> {
  const result = await db.query<User>(`SELECT * FROM users WHERE email = $1`, [email]);
  return result.rows[0] ?? null;
}

export async function findUserByPhone(phone: string, db: Queryable = pool): Promise<User | null> {
  const result = await db.query<User>(`SELECT * FROM users WHERE phone = $1`, [phone]);
  return result.rows[0] ?? null;
}

export interface UpdateUserProfileInput {
  full_name: string;
  email: string;
  phone: string | null;
}

// The Super Admin Pengguna page's "Edit Profil" action — lets an existing
// account (most commonly one missing a WhatsApp number) be filled in or
// corrected after the fact, independent of updateUserStatus.
export async function updateUserProfile(
  id: string,
  input: UpdateUserProfileInput,
  db: Queryable = pool,
): Promise<User | null> {
  const result = await db.query<User>(
    `UPDATE users SET full_name = $2, email = $3, phone = $4 WHERE id = $1 RETURNING *`,
    [id, input.full_name, input.email, input.phone],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string, db: Queryable = pool): Promise<User | null> {
  const result = await db.query<User>(`SELECT * FROM users WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

// Akun > Keamanan's "Batasi Perangkat" — null clears the override back to
// "use the platform default" (security_policies.max_devices_per_user).
export async function updateUserMaxActiveDevices(
  id: string,
  maxActiveDevices: number | null,
  db: Queryable = pool,
): Promise<void> {
  await db.query(`UPDATE users SET max_active_devices = $2 WHERE id = $1`, [id, maxActiveDevices]);
}

// Akun > Ganti Password — the caller has already re-verified
// currentPassword against the existing hash before calling this; this
// function just writes the new one.
export async function updateUserPassword(
  id: string,
  passwordHash: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [id, passwordHash]);
}

export async function updateUserStatus(
  id: string,
  status: UserStatus,
  db: Queryable = pool,
): Promise<User | null> {
  const result = await db.query<User>(
    `UPDATE users SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status],
  );
  return result.rows[0] ?? null;
}

export async function countUsers(db: Queryable = pool): Promise<number> {
  const result = await db.query<{ count: string }>(`SELECT COUNT(*) FROM users`);
  return Number(result.rows[0].count);
}

// Brute-force lockout — set once login_activities' recent LOGIN_FAILED
// count trips security_policies.max_login_attempts, cleared on a
// subsequent successful login or by resolving the resulting security
// incident (src/services/security.service.ts).
export async function lockUserAccount(userId: string, lockedUntil: Date, db: Queryable = pool): Promise<void> {
  await db.query(`UPDATE users SET locked_until = $2 WHERE id = $1`, [userId, lockedUntil]);
}

export async function clearUserAccountLock(userId: string, db: Queryable = pool): Promise<void> {
  await db.query(`UPDATE users SET locked_until = NULL WHERE id = $1`, [userId]);
}

export interface UserWithRoles extends User {
  roles: RoleCode[];
}

export interface ListUsersFilter {
  /** Matches against email or full_name, case-insensitive. */
  search?: string;
  status?: UserStatus;
  role?: RoleCode;
  limit?: number;
  offset?: number;
}

function buildUserFilterConditions(filter: ListUsersFilter): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.search) {
    params.push(`%${filter.search}%`);
    conditions.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (filter.status) {
    params.push(filter.status);
    conditions.push(`u.status = $${params.length}`);
  }
  if (filter.role) {
    params.push(filter.role);
    conditions.push(
      `EXISTS (SELECT 1 FROM user_roles ur2 JOIN roles r2 ON r2.id = ur2.role_id WHERE ur2.user_id = u.id AND r2.code = $${params.length})`,
    );
  }

  return { where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

// One row per user with its role codes aggregated (a user usually has
// exactly one role, but the schema allows more) — avoids an N+1 query for
// the users list/table.
export async function listUsers(
  filter: ListUsersFilter = {},
  db: Queryable = pool,
): Promise<UserWithRoles[]> {
  const { where, params } = buildUserFilterConditions(filter);

  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;
  params.push(limit, offset);

  const result = await db.query<UserWithRoles>(
    `SELECT u.*, COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     ${where}
     GROUP BY u.id
     ORDER BY u.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return result.rows;
}

export async function countFilteredUsers(
  filter: ListUsersFilter = {},
  db: Queryable = pool,
): Promise<number> {
  const { where, params } = buildUserFilterConditions(filter);
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM users u ${where}`,
    params,
  );
  return Number(result.rows[0].count);
}

export async function assignRole(userId: string, roleCode: RoleCode, db: Queryable = pool): Promise<void> {
  await db.query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, id FROM roles WHERE code = $2
     ON CONFLICT DO NOTHING`,
    [userId, roleCode],
  );
}

export async function listRolesForUser(userId: string, db: Queryable = pool): Promise<Role[]> {
  const result = await db.query<Role>(
    `SELECT r.* FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId],
  );
  return result.rows;
}

// --- Transaction PIN -------------------------------------------------
//
// `pin_hash` is only ever selected by getTransactionPinForVerification.
// Every other function here explicitly lists columns so a stray
// `SELECT *` never leaks the hash into logs, API responses, or audit rows.

export async function createTransactionPin(
  userId: string,
  pinHash: string,
  db: Queryable = pool,
): Promise<UserTransactionPin> {
  const result = await db.query<UserTransactionPin>(
    `INSERT INTO user_transaction_pins (user_id, pin_hash)
     VALUES ($1, $2)
     RETURNING id, user_id, status, failed_attempts, locked_until, pin_changed_at, created_at, updated_at`,
    [userId, pinHash],
  );
  return result.rows[0];
}

export async function getTransactionPin(
  userId: string,
  db: Queryable = pool,
): Promise<UserTransactionPin | null> {
  const result = await db.query<UserTransactionPin>(
    `SELECT id, user_id, status, failed_attempts, locked_until, pin_changed_at, created_at, updated_at
     FROM user_transaction_pins WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function getTransactionPinForVerification(
  userId: string,
  db: Queryable = pool,
): Promise<UserTransactionPinForVerification | null> {
  const result = await db.query<UserTransactionPinForVerification>(
    `SELECT * FROM user_transaction_pins WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function incrementPinFailedAttempts(
  userId: string,
  db: Queryable = pool,
): Promise<number> {
  const result = await db.query<{ failed_attempts: number }>(
    `UPDATE user_transaction_pins
     SET failed_attempts = failed_attempts + 1
     WHERE user_id = $1
     RETURNING failed_attempts`,
    [userId],
  );
  return result.rows[0]?.failed_attempts ?? 0;
}

export async function resetPinFailedAttempts(userId: string, db: Queryable = pool): Promise<void> {
  await db.query(
    `UPDATE user_transaction_pins
     SET failed_attempts = 0, status = 'ACTIVE', locked_until = NULL
     WHERE user_id = $1`,
    [userId],
  );
}

export async function lockTransactionPin(
  userId: string,
  lockedUntil: Date,
  db: Queryable = pool,
): Promise<void> {
  await db.query<{ status: PinStatus }>(
    `UPDATE user_transaction_pins
     SET status = 'LOCKED', locked_until = $2
     WHERE user_id = $1`,
    [userId, lockedUntil],
  );
}

export async function changeTransactionPin(
  userId: string,
  newPinHash: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE user_transaction_pins
     SET pin_hash = $2, pin_changed_at = now(), failed_attempts = 0, status = 'ACTIVE', locked_until = NULL
     WHERE user_id = $1`,
    [userId, newPinHash],
  );
}
