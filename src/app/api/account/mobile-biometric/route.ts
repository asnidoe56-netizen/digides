import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { findSessionById } from "@/repositories/user-session.repository";
import { listMyMobileBiometricCredentials, registerMobileBiometricCredential } from "@/services/mobile-biometric.service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const credentials = await listMyMobileBiometricCredentials(session.userId);
  return NextResponse.json({ credentials });
}

const registerSchema = z.object({
  credentialId: z.string().min(1),
  publicKey: z.string().min(1),
  algorithm: z.enum(["RSA", "ECDSA"]),
  platform: z.enum(["android", "ios"]),
  // Defaults to TRANSACTION so the existing Akun > Keamanan "Daftarkan
  // Perangkat Ini" call (which predates this field) keeps working
  // unchanged — only the new login-activation flow sends "LOGIN".
  purpose: z.enum(["TRANSACTION", "LOGIN"]).default("TRANSACTION"),
  deviceLabel: z.string().trim().min(1).max(120),
});

// The Flutter app's counterpart to /api/account/biometric/register — no
// attestation to verify here (see mobile-biometric.service.ts), just
// recording the public key the device already generated in secure
// hardware, biometric-gated, before this call. The calling session's own
// device is captured here (not asked of the client) so a LOGIN credential
// is bound to a real, already-trust-checked user_devices row — required
// for biometric login's device binding (migration 030).
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const currentSession = await findSessionById(session.sessionId);
  if (parsed.data.purpose === "LOGIN" && !currentSession?.device_id) {
    return NextResponse.json(
      { error: "Perangkat tidak dapat diverifikasi. Silakan login ulang lalu coba lagi." },
      { status: 400 },
    );
  }

  try {
    const credential = await registerMobileBiometricCredential(
      session.userId,
      currentSession?.device_id ?? null,
      parsed.data,
    );

    await recordAuditLog({
      actor_user_id: session.userId,
      action: "USER_MOBILE_BIOMETRIC_REGISTERED",
      entity: "users",
      entity_id: session.userId,
      new_value: { device_label: credential.device_label, platform: credential.platform, purpose: credential.purpose },
    });

    return NextResponse.json({ credential });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mendaftarkan biometrik.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
