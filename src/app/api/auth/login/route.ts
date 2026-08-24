import { NextResponse } from "next/server";
import { loginSchema } from "@/features/auth/schemas/login.schema";
import { findUserByEmail, listRolesForUser } from "@/repositories/user.repository";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

const INVALID_CREDENTIALS_MESSAGE = "Email atau password salah";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const user = await findUserByEmail(email);

  // Same error for "no such user" and "wrong password" — never reveal
  // which one it was.
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
  }

  const passwordMatches = await verifyPassword(password, user.password_hash);
  if (!passwordMatches) {
    return NextResponse.json({ error: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
  }

  const roles = await listRolesForUser(user.id);
  const roleCodes = roles.map((role) => role.code);
  const token = createSessionToken(user.id, roleCodes);

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
