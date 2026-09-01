import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { getClientIp } from "@/lib/security/request-ip";
import { findUserById, listRolesForUser } from "@/repositories/user.repository";
import { findDeviceById, touchDevice } from "@/repositories/user-device.repository";
import { createLoginSession } from "@/services/security.service";
import { verifyMobileBiometricLogin } from "@/services/mobile-biometric.service";

const schema = z.object({
  credentialId: z.string().min(1),
  challenge: z.string().min(1),
  signature: z.string().min(1),
});

// Public — deliberately no session required, same as /api/auth/login.
// Step 2 of the Flutter login screen's "Masuk dengan Sidik Jari": the
// cryptographic signature verification in verifyMobileBiometricLogin IS
// the backend authentication (equivalent in strength to a correct
// password) — a successful biometric prompt alone is never enough on its
// own, exactly like a purchase's biometric confirmation still has to run
// the real challenge-response before executeTransaction ever runs.
// Mirrors /api/auth/login's own account-status/lockout checks and session
// issuance as closely as possible; the only things that differ are (a)
// there's no password to verify — the signature already proved device
// possession, and (b) the device is already known via the credential's
// own device_id rather than re-fingerprinted from the request's User-Agent.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get("user-agent");

  let result;
  try {
    result = await verifyMobileBiometricLogin(parsed.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verifikasi biometrik gagal. Silakan gunakan password.";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const user = await findUserById(result.userId);
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Akun tidak ditemukan atau tidak aktif." }, { status: 403 });
  }

  if (user.locked_until && user.locked_until > new Date()) {
    const minutesLeft = Math.ceil((user.locked_until.getTime() - Date.now()) / 60_000);
    return NextResponse.json(
      { error: `Akun terkunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam ${minutesLeft} menit.` },
      { status: 429 },
    );
  }

  // A LOGIN credential always captures its device_id at registration
  // (enforced in /api/account/mobile-biometric) — a credential with none
  // is treated as invalid rather than issuing a session with no device
  // binding at all.
  if (!result.deviceId) {
    return NextResponse.json({ error: "Kredensial biometrik tidak valid. Silakan login dengan password." }, { status: 400 });
  }

  const device = await findDeviceById(result.deviceId);
  if (!device || device.trust_status === "BLOCKED" || device.trust_status === "REVOKED") {
    return NextResponse.json(
      { error: "Perangkat ini telah diblokir. Gunakan password atau hubungi admin." },
      { status: 403 },
    );
  }
  await touchDevice(device.id, ipAddress);

  const roles = await listRolesForUser(user.id);
  const roleCodes = roles.map((role) => role.code);

  const session = await createLoginSession(user.id, device.id, user.email, ipAddress, userAgent);
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
