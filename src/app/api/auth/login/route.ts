import { NextResponse } from "next/server";
import { loginSchema } from "@/features/auth/schemas/login.schema";
import { recordLoginActivity } from "@/repositories/login-activity.repository";
import { findUserByEmail, listRolesForUser } from "@/repositories/user.repository";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { getClientIp } from "@/lib/security/request-ip";
import { authorizeDeviceForLogin, createLoginSession, recordFailedLogin } from "@/services/security.service";

const INVALID_CREDENTIALS_MESSAGE = "Email atau password salah";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent");

  const user = await findUserByEmail(email);

  // Same error for "no such user" and "wrong password" — never reveal
  // which one it was.
  if (!user || user.status !== "ACTIVE") {
    await recordFailedLogin(email, null, ipAddress, userAgent, "Akun tidak ditemukan");
    return NextResponse.json({ error: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
  }

  if (user.locked_until && user.locked_until > new Date()) {
    const minutesLeft = Math.ceil((user.locked_until.getTime() - Date.now()) / 60_000);
    // A plain log entry, not recordFailedLogin() — an already-locked
    // account must not re-enter brute-force counting on every retry
    // (that would keep inflating the failure count and re-creating a new
    // incident for as long as someone keeps hammering a locked account).
    await recordLoginActivity({
      user_id: user.id,
      attempted_email: email,
      event_type: "LOGIN_FAILED",
      ip_address: ipAddress,
      user_agent: userAgent,
      detail: "Akun sedang terkunci",
    });
    return NextResponse.json(
      { error: `Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam ${minutesLeft} menit.` },
      { status: 429 },
    );
  }

  const passwordMatches = await verifyPassword(password, user.password_hash);
  if (!passwordMatches) {
    const lockResult = await recordFailedLogin(email, user.id, ipAddress, userAgent, "Password salah");
    if (lockResult.locked) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan gagal. Akun dikunci selama ${lockResult.lockoutMinutes} menit.` },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
  }

  const deviceResult = await authorizeDeviceForLogin(user.id, email, ipAddress, userAgent);
  if (!deviceResult.allowed) {
    return NextResponse.json({ error: deviceResult.reason }, { status: deviceResult.status });
  }

  const roles = await listRolesForUser(user.id);
  const roleCodes = roles.map((role) => role.code);

  const session = await createLoginSession(user.id, deviceResult.deviceId, email, ipAddress, userAgent);

  const token = createSessionToken(user.id, roleCodes, session.id);

  const response = NextResponse.json({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    roles: roleCodes,
  });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
