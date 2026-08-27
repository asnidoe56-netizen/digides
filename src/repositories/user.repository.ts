import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { Role, RoleCode, User, UserStatus } from "@/types/user";
import type { PinStatus, UserTransactionPin, UserTransactionPinForVerification } from "@/types/auth";

export interface CreateUserInput {
  email: string;
  password_hash: string;
  full_name: string;
  phone?: string | null;
}

export async function createUser(input: CreateUserInput, db: Queryable = pool): Promise<User> {
  const result = await db.query<User>(
    `INSERT INTO users (email, password_hash, full_name, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.email, input.password_hash, input.full_name, input.phone ?? null],
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

export async function findUserById(id: string, db: Queryable = pool): Promise<User | null> {
  const result = await db.query<User>(`SELECT * FROM users WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
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
