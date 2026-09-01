import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { findUserById } from "@/repositories/user.repository";

const verifyPasswordSchema = z.object({
  password: z.string().min(1),
});

// A pure check, no side effects — same bcrypt compare
// /api/account/change-password already uses for its "Password Saat Ini"
// field, just without also changing anything. First caller is the
// Flutter app's login screen: "Aktifkan Login Biometrik?" requires the
// mitra to re-prove password ownership (the login-flow equivalent of
// verify-pin's PIN re-proof before transaction biometric activation)
// before a login credential is ever created. Never compares plaintext —
// verifyPassword is the same bcrypt.compare the login route itself uses.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = verifyPasswordSchema.safeParse(body);
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

  const matches = await verifyPassword(parsed.data.password, user.password_hash);
  if (!matches) {
    return NextResponse.json({ error: "Password salah" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
