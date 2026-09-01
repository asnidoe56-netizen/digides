import { NextResponse } from "next/server";
import { changePasswordServerSchema } from "@/features/mitra-account/schemas/change-password.schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/repositories/audit.repository";
import { findUserById, updateUserPassword } from "@/repositories/user.repository";
import { revokeAllOtherSessionsForUser } from "@/repositories/user-session.repository";
import { getSession } from "@/lib/auth/session";

// Akun > Ganti Password — always scoped to the caller's own session
// (never a client-supplied user id), same "self-service only" shape as
// PATCH /api/account/profile. On success, every other active session for
// this account is revoked (not this one, so the mitra isn't logged out of
// the screen they just used) — a changed password is exactly the moment a
// stolen session elsewhere should stop working.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changePasswordServerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  const currentPasswordMatches = await verifyPassword(parsed.data.currentPassword, user.password_hash);
  if (!currentPasswordMatches) {
    return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });
  }

  const newHash = await hashPassword(parsed.data.newPassword);
  await updateUserPassword(session.userId, newHash);
  await revokeAllOtherSessionsForUser(session.userId, session.sessionId, "PASSWORD_CHANGED");

  // No old/new value — a password hash has no business being anywhere
  // near an audit log, even hashed.
  await recordAuditLog({
    actor_user_id: session.userId,
    action: "USER_PASSWORD_CHANGED",
    entity: "users",
    entity_id: session.userId,
  });

  return NextResponse.json({ success: true });
}
