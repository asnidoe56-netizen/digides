import { randomInt } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/repositories/audit.repository";
import {
  clearUserAccountLock,
  findUserById,
  resetUserPasswordByAdmin,
} from "@/repositories/user.repository";
import { revokeAllSessionsForUser } from "@/repositories/user-session.repository";

// docs/security/PEMULIHAN_AKSES_AKUN.md — the two admin actions that give
// a locked-out mitra their account back.
//
// The case that produced this: a mitra forgot both her email and her
// password, guessed until the brute-force rule locked her out, and there
// was no way back at all. The lockout lifts itself after fifteen minutes,
// she guesses again, and locks herself out again — forever, because
// Digides had no password recovery of any kind. Her account holds a
// wallet balance.

// Ambiguous characters are left out on purpose. This password gets read
// off a screen and spoken down a phone line — "0" against "O" and "1"
// against "l" is where that goes wrong, and a failed login here sends the
// mitra straight back into the lockout this is meant to end.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TEMPORARY_PASSWORD_LENGTH = 10;

function generateTemporaryPassword(): string {
  // randomInt, not Math.random: this is a working credential for an
  // account holding money, and Math.random is predictable by design.
  let password = "";
  for (let i = 0; i < TEMPORARY_PASSWORD_LENGTH; i += 1) {
    password += ALPHABET[randomInt(ALPHABET.length)];
  }
  return password;
}

export interface AdminPasswordResetResult {
  /** Plaintext, returned exactly once and never stored. */
  temporaryPassword: string;
  userName: string;
  userEmail: string;
  revokedSessions: number;
}

// Prioritas 1. Issues a temporary password and forces the mitra to
// replace it on their next login.
//
// What this deliberately does NOT touch: the transaction PIN. It lives in
// its own table with its own hash, so an admin who runs this still cannot
// spend a single rupiah of that mitra's balance. That separation is the
// entire reason this feature is safe to build, and anything that later
// blurs it turns a support tool into a way to empty wallets.
export async function resetUserPasswordAsAdmin(
  userId: string,
  actorUserId: string,
): Promise<AdminPasswordResetResult> {
  if (userId === actorUserId) {
    // Not a safety rule so much as an honesty one: an admin who has
    // forgotten their own password cannot be logged in to run this, so a
    // self-reset is always someone doing something other than recovering
    // an account.
    throw new Error("Gunakan Ganti Password untuk akun Anda sendiri");
  }

  const user = await findUserById(userId);
  if (!user) {
    throw new Error("Pengguna tidak ditemukan");
  }
  if (user.status === "DELETED") {
    throw new Error("Akun ini sudah dihapus, tidak bisa dipulihkan");
  }

  const temporaryPassword = generateTemporaryPassword();
  const updated = await resetUserPasswordByAdmin(userId, await hashPassword(temporaryPassword));
  if (!updated) {
    throw new Error("Gagal mengatur ulang password");
  }

  // Every existing session dies with the old password. If this reset is
  // happening because someone else got into the account, leaving their
  // session alive would make the reset pointless.
  const revokedSessions = await revokeAllSessionsForUser(userId, "PASSWORD_CHANGED");

  // No password, hashed or otherwise, goes anywhere near the audit log —
  // the same rule POST /api/account/change-password already follows.
  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "USER_PASSWORD_RESET_BY_ADMIN",
    entity: "users",
    entity_id: userId,
    new_value: { revoked_sessions: revokedSessions, must_change_password: true },
  });

  return {
    temporaryPassword,
    userName: updated.full_name,
    userEmail: updated.email,
    revokedSessions,
  };
}

// Prioritas 2. Lifts a brute-force lockout without waiting it out.
//
// The same thing already happens as a side effect of resolving a
// BRUTE_FORCE_LOGIN incident under Keamanan — but no admin looks there
// when the report says "this user can't log in". They open the user. So
// the action lives on the user too.
export async function unlockUserAccount(userId: string, actorUserId: string): Promise<void> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("Pengguna tidak ditemukan");
  }
  if (!user.locked_until || user.locked_until <= new Date()) {
    // Said plainly rather than silently succeeding: an admin who unlocks
    // an account that was never locked has diagnosed the wrong problem,
    // and a cheerful "berhasil" would send them away satisfied while the
    // mitra still can't log in.
    throw new Error("Akun ini sedang tidak terkunci");
  }

  await clearUserAccountLock(userId);

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "USER_ACCOUNT_UNLOCKED",
    entity: "users",
    entity_id: userId,
    new_value: { locked_until_before: user.locked_until.toISOString() },
  });
}
